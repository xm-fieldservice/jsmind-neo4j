#!/usr/bin/env python3
"""
查询ChromaDB向量库的交互式脚本
"""

import chromadb
from chromadb.config import Settings
import argparse
import json

class VectorStoreQuery:
    def __init__(self, db_path="./chroma_db"):
        """初始化查询器"""
        self.client = chromadb.PersistentClient(path=db_path)
    
    def list_collections(self):
        """列出所有集合"""
        collections = self.client.list_collections()
        return [col.name for col in collections]
    
    def query_collection(self, collection_name, query_text, n_results=3, source_filter=None):
        """查询指定集合"""
        try:
            collection = self.client.get_collection(name=collection_name)
        except Exception as e:
            print(f"集合 {collection_name} 不存在: {e}")
            return None
        
        where_filter = None
        if source_filter:
            where_filter = {"source_file": {"$eq": source_filter}}
        
        results = collection.query(
            query_texts=[query_text],
            n_results=n_results,
            where=where_filter
        )
        
        return results
    
    def get_document_by_source(self, collection_name, source_file):
        """获取特定源文件的所有文档"""
        try:
            collection = self.client.get_collection(name=collection_name)
        except Exception as e:
            print(f"集合 {collection_name} 不存在: {e}")
            return None
        
        results = collection.get(
            where={"source_file": {"$eq": source_file}}
        )
        
        return results
    
    def interactive_query(self, collection_name="project_documents"):
        """交互式查询"""
        print("=== ChromaDB 向量库查询工具 ===")
        print(f"当前集合: {collection_name}")
        print("输入 'quit' 退出, 'help' 查看帮助")
        
        while True:
            query = input("\n请输入查询内容: ").strip()
            
            if query.lower() == 'quit':
                break
            elif query.lower() == 'help':
                print("""
可用命令:
- quit: 退出程序
- help: 显示帮助
- stats: 显示集合统计
- sources: 显示所有源文件
- filter <文件名>: 只查询特定文件
                """)
                continue
            elif query.lower() == 'stats':
                try:
                    collection = self.client.get_collection(name=collection_name)
                    count = collection.count()
                    print(f"集合中共有 {count} 个文档")
                    
                    # 获取所有源文件
                    all_docs = collection.get()
                    sources = set()
                    for meta in all_docs['metadatas']:
                        sources.add(meta.get('source_file', 'unknown'))
                    
                    print("源文件列表:")
                    for source in sorted(sources):
                        source_count = sum(1 for m in all_docs['metadatas'] 
                                         if m.get('source_file') == source)
                        print(f"  - {source}: {source_count} 个分块")
                except Exception as e:
                    print(f"获取统计信息时出错: {e}")
                continue
            elif query.lower() == 'sources':
                try:
                    collection = self.client.get_collection(name=collection_name)
                    all_docs = collection.get()
                    sources = set()
                    for meta in all_docs['metadatas']:
                        sources.add(meta.get('source_file', 'unknown'))
                    
                    print("可用源文件:")
                    for source in sorted(sources):
                        print(f"  - {source}")
                except Exception as e:
                    print(f"获取源文件列表时出错: {e}")
                continue
            elif query.startswith('filter '):
                source_filter = query[7:].strip()
                query_text = input(f"请输入针对 {source_filter} 的查询内容: ").strip()
            else:
                source_filter = None
                query_text = query
            
            if not query_text:
                continue
            
            try:
                results = self.query_collection(collection_name, query_text, n_results=3, 
                                            source_filter=source_filter)
                
                if results and results['documents'][0]:
                    print(f"\n查询结果 (找到 {len(results['documents'][0])} 个相关文档):")
                    print("=" * 50)
                    
                    for i, (doc, metadata, distance) in enumerate(zip(
                        results['documents'][0], 
                        results['metadatas'][0], 
                        results['distances'][0]
                    )):
                        similarity = 1 - distance
                        print(f"\n{i+1}. 文件: {metadata.get('source_file', 'unknown')}")
                        print(f"   相似度: {similarity:.3f}")
                        print(f"   分块: {metadata.get('chunk_index', 0)}/{metadata.get('total_chunks', 1)}")
                        print(f"   内容: {doc[:200]}...")
                        if len(doc) > 200:
                            print(f"   ...")
                else:
                    print("未找到相关文档")
                    
            except Exception as e:
                print(f"查询时出错: {e}")

def main():
    parser = argparse.ArgumentParser(description='查询ChromaDB向量库')
    parser.add_argument('--db-path', default='./chroma_db', help='向量库路径')
    parser.add_argument('--collection', default='project_documents', help='集合名称')
    parser.add_argument('--query', help='查询内容')
    parser.add_argument('--n-results', type=int, default=3, help='返回结果数量')
    parser.add_argument('--source', help='源文件过滤')
    parser.add_argument('--interactive', action='store_true', help='交互式模式')
    
    args = parser.parse_args()
    
    query_tool = VectorStoreQuery(args.db_path)
    
    if args.interactive:
        query_tool.interactive_query(args.collection)
    elif args.query:
        results = query_tool.query_collection(
            args.collection, 
            args.query, 
            args.n_results, 
            args.source
        )
        
        if results:
            print(json.dumps(results, indent=2, ensure_ascii=False))
    else:
        # 列出所有集合
        collections = query_tool.list_collections()
        print("可用集合:")
        for col in collections:
            print(f"  - {col}")

if __name__ == "__main__":
    main()