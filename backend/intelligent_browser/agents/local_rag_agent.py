"""
LocalRAGAgent - 本地文档RAG检索Agent
使用LangChain + ChromaDB实现本地文档智能检索
"""
from typing import Dict, List
from autogen import AssistantAgent
from langchain.vectorstores import Chroma
from langchain.embeddings import OpenAIEmbeddings
from langchain.chains import RetrievalQA
from langchain.llms import OpenAI
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.document_loaders import DirectoryLoader, TextLoader
import os


class LocalRAGAgent:
    """本地文档RAG检索Agent"""
    
    def __init__(self, llm_config: Dict, embedding_config: Dict, chromadb_path: str):
        """
        初始化本地RAG Agent
        
        Args:
            llm_config: LLM配置
            embedding_config: Embedding配置
            chromadb_path: ChromaDB存储路径
        """
        self.llm_config = llm_config
        self.chromadb_path = chromadb_path
        
        # 初始化Embedding模型
        self.embeddings = OpenAIEmbeddings(**embedding_config)
        
        # 初始化或加载ChromaDB
        self.vectorstore = self._init_vectorstore()
        
        # 创建Autogen Agent
        self.agent = AssistantAgent(
            name="LocalRAG",
            system_message="""你是本地文档检索专家。

你可以检索项目中的所有文档,包括:
- Autogen相关技术文档
- 项目架构设计文档
- 工作记录和会议纪要
- 脑图内容

请基于检索到的文档内容,准确回答用户问题。
如果文档中没有相关信息,请明确告知。
""",
            llm_config=llm_config
        )
    
    def _init_vectorstore(self) -> Chroma:
        """
        初始化或加载向量数据库
        
        Returns:
            ChromaDB向量存储
        """
        # 检查是否已有数据
        if os.path.exists(self.chromadb_path) and os.listdir(self.chromadb_path):
            # 加载现有数据
            return Chroma(
                persist_directory=self.chromadb_path,
                embedding_function=self.embeddings
            )
        else:
            # 创建新的空向量库
            return Chroma(
                persist_directory=self.chromadb_path,
                embedding_function=self.embeddings
            )
    
    def index_documents(self, source_dir: str, glob_pattern: str = "**/*.md"):
        """
        索引文档目录
        
        Args:
            source_dir: 源文档目录
            glob_pattern: 文件匹配模式
        """
        print(f"开始索引文档: {source_dir}")
        
        # 加载文档
        loader = DirectoryLoader(
            source_dir,
            glob=glob_pattern,
            loader_cls=TextLoader,
            loader_kwargs={'encoding': 'utf-8'}
        )
        documents = loader.load()
        
        print(f"加载了 {len(documents)} 个文档")
        
        # 分块
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len
        )
        docs = text_splitter.split_documents(documents)
        
        print(f"分块后共 {len(docs)} 个文档块")
        
        # 添加到向量库
        self.vectorstore.add_documents(docs)
        self.vectorstore.persist()
        
        print("文档索引完成")
    
    def query(self, question: str, top_k: int = 5) -> Dict:
        """
        查询本地文档
        
        Args:
            question: 用户问题
            top_k: 返回top-k个相关文档
        
        Returns:
            包含answer和sources的字典
        """
        # 创建LLM
        llm = OpenAI(
            openai_api_base=self.llm_config["config_list"][0]["base_url"],
            openai_api_key=self.llm_config["config_list"][0]["api_key"],
            model_name=self.llm_config["config_list"][0]["model"],
            temperature=self.llm_config.get("temperature", 0.7)
        )
        
        # 创建检索QA链
        qa_chain = RetrievalQA.from_chain_type(
            llm=llm,
            chain_type="stuff",
            retriever=self.vectorstore.as_retriever(
                search_kwargs={"k": top_k}
            ),
            return_source_documents=True
        )
        
        # 执行查询
        result = qa_chain({"query": question})
        
        # 提取来源
        sources = []
        if "source_documents" in result:
            for doc in result["source_documents"]:
                sources.append({
                    "content": doc.page_content[:200],  # 限制长度
                    "metadata": doc.metadata
                })
        
        return {
            "answer": result["result"],
            "sources": sources,
            "agent": "LocalRAG"
        }
    
    def get_stats(self) -> Dict:
        """
        获取向量库统计信息
        
        Returns:
            统计信息字典
        """
        collection = self.vectorstore._collection
        return {
            "total_documents": collection.count(),
            "persist_directory": self.chromadb_path
        }
