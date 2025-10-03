#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Markdown文档解析器
从Markdown文档中提取项目、任务、人员等实体和关系
"""

import re
from typing import Dict, List, Any, Tuple
from neo4j import GraphDatabase
from app.database import get_neo4j_driver


class MarkdownDocumentParser:
    """解析Markdown文档并提取实体和关系"""
    
    def __init__(self):
        self.driver = get_neo4j_driver()
        self.entities = {
            'tasks': [],
            'projects': [],
            'persons': [],
            'resources': [],
            'milestones': []
        }
        self.relationships = []
    
    def parse_document(self, content: str) -> Dict[str, Any]:
        """
        解析Markdown文档内容
        返回提取的实体和关系
        """
        lines = content.split('\n')
        current_section = None
        current_project = None
        
        for i, line in enumerate(lines):
            line = line.strip()
            
            # 解析标题（项目）
            if line.startswith('#'):
                level = len(re.match(r'^#+', line).group())
                title = line.lstrip('#').strip()
                
                # 一级标题作为主项目
                if level == 1:
                    current_project = {
                        'id': f"project_{len(self.entities['projects'])}",
                        'name': title,
                        'type': 'project',
                        'level': level,
                        'line': i
                    }
                    self.entities['projects'].append(current_project)
                    current_section = 'project'
                
                # 二级标题作为子项目或任务分类
                elif level == 2:
                    sub_project = {
                        'id': f"project_{len(self.entities['projects'])}",
                        'name': title,
                        'type': 'sub_project',
                        'level': level,
                        'line': i
                    }
                    self.entities['projects'].append(sub_project)
                    
                    # 如果有父项目，建立包含关系
                    if current_project:
                        self.relationships.append({
                            'source': current_project['id'],
                            'target': sub_project['id'],
                            'type': 'CONTAINS',
                            'label': '包含'
                        })
                    
                    current_section = 'sub_project'
            
            # 解析列表项（任务）
            elif line.startswith(('-', '*', '+')):
                task_content = line.lstrip('-*+ ').strip()
                
                # 提取任务信息
                task = self._parse_task(task_content, i)
                if task:
                    self.entities['tasks'].append(task)
                    
                    # 建立任务与项目的关系
                    if current_project:
                        self.relationships.append({
                            'source': current_project['id'],
                            'target': task['id'],
                            'type': 'CONTAINS',
                            'label': '包含'
                        })
            
            # 解析编号列表（任务）
            elif re.match(r'^\d+\.', line):
                task_content = re.sub(r'^\d+\.\s*', '', line).strip()
                task = self._parse_task(task_content, i)
                if task:
                    self.entities['tasks'].append(task)
                    
                    if current_project:
                        self.relationships.append({
                            'source': current_project['id'],
                            'target': task['id'],
                            'type': 'CONTAINS',
                            'label': '包含'
                        })
        
        # 解析实体间的关系
        self._extract_relationships()
        
        return {
            'entities': self.entities,
            'relationships': self.relationships
        }
    
    def _parse_task(self, content: str, line_num: int) -> Dict[str, Any]:
        """解析任务内容"""
        task = {
            'id': f"task_{len(self.entities['tasks'])}",
            'name': content,
            'type': 'task',
            'line': line_num,
            'status': 'pending',
            'priority': 'medium'
        }
        
        # 检测任务状态
        if content.startswith('[ ]'):
            task['status'] = 'todo'
            task['name'] = content[3:].strip()
        elif content.startswith('[x]') or content.startswith('[X]'):
            task['status'] = 'done'
            task['name'] = content[3:].strip()
        
        # 提取优先级标记 (高/中/低, P0/P1/P2)
        if re.search(r'[Pp]0|高|紧急', content):
            task['priority'] = 'high'
        elif re.search(r'[Pp]2|低', content):
            task['priority'] = 'low'
        
        # 提取人员信息 @username
        persons = re.findall(r'@(\w+)', content)
        if persons:
            task['assignees'] = persons
            for person_name in persons:
                person = {
                    'id': f"person_{person_name}",
                    'name': person_name,
                    'type': 'person'
                }
                # 去重
                if not any(p['id'] == person['id'] for p in self.entities['persons']):
                    self.entities['persons'].append(person)
        
        # 提取时间信息
        dates = re.findall(r'\d{4}-\d{2}-\d{2}', content)
        if dates:
            task['deadline'] = dates[0]
        
        return task
    
    def _extract_relationships(self):
        """从实体中提取关系"""
        # 任务间的依赖关系
        for task in self.entities['tasks']:
            content = task['name'].lower()
            
            # 查找依赖关系关键词
            if '依赖' in content or 'depends on' in content:
                # 尝试找到被依赖的任务
                for other_task in self.entities['tasks']:
                    if other_task['id'] != task['id'] and other_task['name'].lower() in content:
                        self.relationships.append({
                            'source': task['id'],
                            'target': other_task['id'],
                            'type': 'DEPENDS_ON',
                            'label': '依赖'
                        })
            
            # 人员负责任务的关系
            if 'assignees' in task:
                for person_name in task['assignees']:
                    person_id = f"person_{person_name}"
                    self.relationships.append({
                        'source': person_id,
                        'target': task['id'],
                        'type': 'RESPONSIBLE_FOR',
                        'label': '负责'
                    })
    
    def import_to_neo4j(self, parsed_data: Dict[str, Any]) -> Dict[str, Any]:
        """将解析的数据导入Neo4j"""
        try:
            entities = parsed_data.get('entities', {})
            relationships = parsed_data.get('relationships', [])
            
            stats = {
                'nodes_created': 0,
                'relationships_created': 0
            }
            
            with self.driver.session() as session:
                # 1. 导入所有实体
                for entity_type, entity_list in entities.items():
                    for entity in entity_list:
                        # 根据type确定标签 - 统一使用首字母大写
                        # task -> Task, project -> Project, person -> Person
                        type_value = entity['type']
                        if type_value == 'task':
                            entity_label = 'Task'
                        elif type_value == 'project' or type_value == 'sub_project':
                            entity_label = 'Project'
                        elif type_value == 'person':
                            entity_label = 'Person'
                        elif type_value == 'resource':
                            entity_label = 'Resource'
                        elif type_value == 'milestone':
                            entity_label = 'Milestone'
                        else:
                            entity_label = type_value.capitalize()
                        
                        # 创建节点（带标签）- 使用APOC或直接在MERGE中指定标签
                        query = f"""
                        MERGE (n:{entity_label} {{id: $id}})
                        SET n.name = $name,
                            n.type = $type
                        """
                        
                        params = {
                            'id': entity['id'],
                            'name': entity['name'],
                            'type': entity['type']
                        }
                        
                        # 添加其他属性
                        for key, value in entity.items():
                            if key not in ['id', 'name', 'type']:
                                query += f", n.{key} = ${key}"
                                params[key] = value
                        
                        query += " RETURN n"
                        
                        session.run(query, **params)
                        stats['nodes_created'] += 1
                
                # 2. 导入关系
                for rel in relationships:
                    query = f"""
                    MATCH (source {{id: $source_id}})
                    MATCH (target {{id: $target_id}})
                    MERGE (source)-[r:{rel['type']}]->(target)
                    SET r.label = $label
                    RETURN r
                    """
                    
                    session.run(query,
                               source_id=rel['source'],
                               target_id=rel['target'],
                               label=rel.get('label', rel['type']))
                    stats['relationships_created'] += 1
            
            return {
                'status': 'success',
                'message': '文档导入成功',
                'stats': stats
            }
        
        except Exception as e:
            print(f"导入Neo4j出错: {str(e)}")
            return {
                'status': 'error',
                'message': f"导入出错: {str(e)}"
            }
