#!/usr/bin/env python3
"""
将本地文档存入ChromaDB向量库的完整实现
"""

import chromadb
from chromadb.config import Settings
import os
import re
from typing import List, Dict, Any

class DocumentVectorStore:
    def __init__(self, db_path="./chroma_db"):
        """初始化文档向量存储"""
        self.client = chromadb.PersistentClient(path=db_path)
        self.collection = None
    
    def create_document_collection(self, collection_name="project_documents"):
        """创建文档集合"""
        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"}
        )
        print(f"已创建/获取集合: {collection_name}")
        return self.collection
    
    def read_markdown_file(self, file_path: str) -> Dict[str, Any]:
        """读取markdown文件内容"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # 提取标题
            title_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
            title = title_match.group(1) if title_match else os.path.basename(file_path)
            
            # 按段落分割
            paragraphs = [p.strip() for p in content.split('\n\n') if p.strip()]
            
            return {
                'title': title,
                'content': content,
                'paragraphs': paragraphs,
                'file_path': file_path
            }
        except Exception as e:
            print(f"读取文件 {file_path} 时出错: {e}")
            return None
    
    def chunk_content(self, content: str, chunk_size: 500) -> List[str]:
        """将内容分块"""
        words = content.split()
        chunks = []
        
        for i in range(0, len(words), chunk_size):
            chunk = ' '.join(words[i:i + chunk_size])
            chunks.append(chunk)
        
        return chunks
    
    def store_file_to_vector_db(self, file_path: str, chunk_size: int = 300) -> bool:
        """将单个文件存入向量库"""
        if not os.path.exists(file_path):
            print(f"文件不存在: {file_path}")
            return False
        
        file_data = self.read_markdown_file(file_path)
        if not file_data:
            return False
        
        # 分块处理
        chunks = self.chunk_content(file_data['content'], chunk_size)
        
        # 准备数据
        documents = []
        metadatas = []
        ids = []
        
        for i, chunk in enumerate(chunks):
            doc_id = f"{os.path.basename(file_path)}_chunk_{i}"
            documents.append(chunk)
            metadatas.append({
                'source_file': os.path.basename(file_path),
                'title': file_data['title'],
                'chunk_index': i,
                'total_chunks': len(chunks)
            })
            ids.append(doc_id)
        
        # 存入向量库
        try:
            self.collection.add(
                documents=documents,
                metadatas=metadatas,
                ids=ids
            )
            print(f"成功将 {file_path} 存入向量库，共 {len(chunks)} 个分块")
            return True
        except Exception as e:
            print(f"存入向量库时出错: {e}")
            return False
    
    def store_directory_to_vector_db(self, directory: str = ".", file_pattern: str = "*.md") -> Dict[str, int]:
        """将整个目录的markdown文件存入向量库"""
        import glob
        
        md_files = glob.glob(os.path.join(directory, file_pattern))
        results = {'success': 0, 'failed': 0, 'total': len(md_files)}
        
        for file_path in md_files:
            if self.store_file_to_vector_db(file_path):
                results['success'] += 1
            else:
                results['failed'] += 1
        
        print(f"处理完成: 成功 {results['success']}, 失败 {results['failed']}, 总计 {results['total']}")
        return results
    
    def search_documents(self, query: str, n_results: int = 3, source_filter: str = None) -> Dict[str, Any]:
        """搜索文档"""
        where_filter = None
        if source_filter:
            where_filter = {"source_file": {"$eq": source_filter}}
        
        results = self.collection.query(
            query_texts=[query],
            n_results=n_results,
            where=where_filter
        )
        
        return results
    
    def get_collection_stats(self) -> Dict[str, Any]:
        """获取集合统计信息"""
        count = self.collection.count()
        
        # 获取所有文档
        all_docs = self.collection.get()
        
        # 按源文件分组统计
        source_stats = {}
        for metadata in all_docs['metadatas']:
            source = metadata['source_file']
            source_stats[source] = source_stats.get(source, 0) + 1
        
        return {
            'total_documents': count,
            'source_files': source_stats
        }

# 使用示例
def main():
    # 初始化向量存储
    vector_store = DocumentVectorStore()
    
    # 创建集合
    vector_store.create_document_collection()
    
    # 存储当前目录的所有markdown文件
    results = vector_store.store_directory_to_vector_db(".", "*.md")
    
    # 搜索示例
    search_results = vector_store.search_documents("游戏化项目管理", n_results=2)
    
    print("\n搜索结果:")
    for i, (doc, metadata, distance) in enumerate(zip(
        search_results['documents'][0], 
        search_results['metadatas'][0], 
        search_results['distances'][0]
    )):
        print(f"\n{i+1}. 来自文件: {metadata['source_file']}")
        print(f"   相似度: {1-distance:.3f}")
        print(f"   内容预览: {doc[:100]}...")
    
    # 查看统计信息
    stats = vector_store.get_collection_stats()
    print(f"\n向量库统计: {stats}")

if __name__ == "__main__":
    main()