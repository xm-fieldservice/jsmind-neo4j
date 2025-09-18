"""
服务器端部署配置
冷热数据分层的向量库、图库、数据库服务器部署方案
"""
import os
from pathlib import Path
from typing import Dict, Any, List
from dataclasses import dataclass
from enum import Enum


class ServerTier(Enum):
    """服务器层级"""
    HOT_TIER = "hot"      # 热数据层：高性能服务器
    WARM_TIER = "warm"    # 温数据层：标准服务器
    COLD_TIER = "cold"    # 冷数据层：存储服务器
    ARCHIVE_TIER = "archive"  # 归档层：归档服务器


@dataclass
class ServerConfig:
    """服务器配置"""
    host: str
    port: int
    database: str
    username: str
    password: str
    tier: ServerTier
    max_connections: int = 100
    timeout: int = 30


class ServerDeploymentConfig:
    """服务器部署配置管理"""
    
    def __init__(self):
        # 向量数据库配置（ChromaDB集群）
        self.vector_db_configs = {
            ServerTier.HOT_TIER: ServerConfig(
                host=os.getenv("VECTOR_HOT_HOST", "vector-hot.internal"),
                port=int(os.getenv("VECTOR_HOT_PORT", "8000")),
                database="mindmap_vectors_hot",
                username=os.getenv("VECTOR_HOT_USER", "admin"),
                password=os.getenv("VECTOR_HOT_PASS", ""),
                tier=ServerTier.HOT_TIER,
                max_connections=200,
                timeout=5
            ),
            ServerTier.WARM_TIER: ServerConfig(
                host=os.getenv("VECTOR_WARM_HOST", "vector-warm.internal"),
                port=int(os.getenv("VECTOR_WARM_PORT", "8001")),
                database="mindmap_vectors_warm",
                username=os.getenv("VECTOR_WARM_USER", "admin"),
                password=os.getenv("VECTOR_WARM_PASS", ""),
                tier=ServerTier.WARM_TIER,
                max_connections=100,
                timeout=15
            ),
            ServerTier.COLD_TIER: ServerConfig(
                host=os.getenv("VECTOR_COLD_HOST", "vector-cold.internal"),
                port=int(os.getenv("VECTOR_COLD_PORT", "8002")),
                database="mindmap_vectors_cold",
                username=os.getenv("VECTOR_COLD_USER", "admin"),
                password=os.getenv("VECTOR_COLD_PASS", ""),
                tier=ServerTier.COLD_TIER,
                max_connections=50,
                timeout=60
            )
        }
        
        # 图数据库配置（Neo4j集群）
        self.graph_db_configs = {
            ServerTier.HOT_TIER: ServerConfig(
                host=os.getenv("NEO4J_HOT_HOST", "neo4j-hot.internal"),
                port=int(os.getenv("NEO4J_HOT_PORT", "7687")),
                database="mindmap_graph_hot",
                username=os.getenv("NEO4J_HOT_USER", "neo4j"),
                password=os.getenv("NEO4J_HOT_PASS", ""),
                tier=ServerTier.HOT_TIER,
                max_connections=150,
                timeout=10
            ),
            ServerTier.WARM_TIER: ServerConfig(
                host=os.getenv("NEO4J_WARM_HOST", "neo4j-warm.internal"),
                port=int(os.getenv("NEO4J_WARM_PORT", "7688")),
                database="mindmap_graph_warm",
                username=os.getenv("NEO4J_WARM_USER", "neo4j"),
                password=os.getenv("NEO4J_WARM_PASS", ""),
                tier=ServerTier.WARM_TIER,
                max_connections=100,
                timeout=30
            ),
            ServerTier.COLD_TIER: ServerConfig(
                host=os.getenv("NEO4J_COLD_HOST", "neo4j-cold.internal"),
                port=int(os.getenv("NEO4J_COLD_PORT", "7689")),
                database="mindmap_graph_cold",
                username=os.getenv("NEO4J_COLD_USER", "neo4j"),
                password=os.getenv("NEO4J_COLD_PASS", ""),
                tier=ServerTier.COLD_TIER,
                max_connections=50,
                timeout=120
            )
        }
        
        # 关系数据库配置（PostgreSQL集群）
        self.relational_db_configs = {
            ServerTier.HOT_TIER: ServerConfig(
                host=os.getenv("PG_HOT_HOST", "postgres-hot.internal"),
                port=int(os.getenv("PG_HOT_PORT", "5432")),
                database="mindmap_data_hot",
                username=os.getenv("PG_HOT_USER", "postgres"),
                password=os.getenv("PG_HOT_PASS", ""),
                tier=ServerTier.HOT_TIER,
                max_connections=200,
                timeout=5
            ),
            ServerTier.WARM_TIER: ServerConfig(
                host=os.getenv("PG_WARM_HOST", "postgres-warm.internal"),
                port=int(os.getenv("PG_WARM_PORT", "5433")),
                database="mindmap_data_warm",
                username=os.getenv("PG_WARM_USER", "postgres"),
                password=os.getenv("PG_WARM_PASS", ""),
                tier=ServerTier.WARM_TIER,
                max_connections=100,
                timeout=15
            ),
            ServerTier.COLD_TIER: ServerConfig(
                host=os.getenv("PG_COLD_HOST", "postgres-cold.internal"),
                port=int(os.getenv("PG_COLD_PORT", "5434")),
                database="mindmap_data_cold",
                username=os.getenv("PG_COLD_USER", "postgres"),
                password=os.getenv("PG_COLD_PASS", ""),
                tier=ServerTier.COLD_TIER,
                max_connections=50,
                timeout=60
            ),
            ServerTier.ARCHIVE_TIER: ServerConfig(
                host=os.getenv("PG_ARCHIVE_HOST", "postgres-archive.internal"),
                port=int(os.getenv("PG_ARCHIVE_PORT", "5435")),
                database="mindmap_data_archive",
                username=os.getenv("PG_ARCHIVE_USER", "postgres"),
                password=os.getenv("PG_ARCHIVE_PASS", ""),
                tier=ServerTier.ARCHIVE_TIER,
                max_connections=20,
                timeout=300
            )
        }
        
        # Redis缓存配置
        self.redis_configs = {
            ServerTier.HOT_TIER: ServerConfig(
                host=os.getenv("REDIS_HOT_HOST", "redis-hot.internal"),
                port=int(os.getenv("REDIS_HOT_PORT", "6379")),
                database="0",
                username="",
                password=os.getenv("REDIS_HOT_PASS", ""),
                tier=ServerTier.HOT_TIER,
                max_connections=500,
                timeout=1
            ),
            ServerTier.WARM_TIER: ServerConfig(
                host=os.getenv("REDIS_WARM_HOST", "redis-warm.internal"),
                port=int(os.getenv("REDIS_WARM_PORT", "6380")),
                database="0",
                username="",
                password=os.getenv("REDIS_WARM_PASS", ""),
                tier=ServerTier.WARM_TIER,
                max_connections=200,
                timeout=5
            )
        }
    
    def get_vector_db_config(self, tier: ServerTier) -> ServerConfig:
        """获取向量数据库配置"""
        return self.vector_db_configs.get(tier)
    
    def get_graph_db_config(self, tier: ServerTier) -> ServerConfig:
        """获取图数据库配置"""
        return self.graph_db_configs.get(tier)
    
    def get_relational_db_config(self, tier: ServerTier) -> ServerConfig:
        """获取关系数据库配置"""
        return self.relational_db_configs.get(tier)
    
    def get_redis_config(self, tier: ServerTier) -> ServerConfig:
        """获取Redis配置"""
        return self.redis_configs.get(tier)
    
    def get_all_configs(self) -> Dict[str, Dict[ServerTier, ServerConfig]]:
        """获取所有配置"""
        return {
            "vector_db": self.vector_db_configs,
            "graph_db": self.graph_db_configs,
            "relational_db": self.relational_db_configs,
            "redis": self.redis_configs
        }
    
    def validate_configs(self) -> Dict[str, List[str]]:
        """验证配置"""
        errors = {
            "vector_db": [],
            "graph_db": [],
            "relational_db": [],
            "redis": []
        }
        
        # 验证向量数据库配置
        for tier, config in self.vector_db_configs.items():
            if not config.host:
                errors["vector_db"].append(f"{tier.value}: 缺少主机配置")
            if not config.password:
                errors["vector_db"].append(f"{tier.value}: 缺少密码配置")
        
        # 验证图数据库配置
        for tier, config in self.graph_db_configs.items():
            if not config.host:
                errors["graph_db"].append(f"{tier.value}: 缺少主机配置")
            if not config.password:
                errors["graph_db"].append(f"{tier.value}: 缺少密码配置")
        
        # 验证关系数据库配置
        for tier, config in self.relational_db_configs.items():
            if not config.host:
                errors["relational_db"].append(f"{tier.value}: 缺少主机配置")
            if not config.password:
                errors["relational_db"].append(f"{tier.value}: 缺少密码配置")
        
        # 验证Redis配置
        for tier, config in self.redis_configs.items():
            if not config.host:
                errors["redis"].append(f"{tier.value}: 缺少主机配置")
        
        return errors
    
    def generate_docker_compose(self) -> str:
        """生成Docker Compose配置"""
        compose_content = """version: '3.8'

services:
  # 向量数据库服务
  chromadb-hot:
    image: chromadb/chroma:latest
    container_name: chromadb-hot
    ports:
      - "8000:8000"
    environment:
      - CHROMA_SERVER_HOST=0.0.0.0
      - CHROMA_SERVER_HTTP_PORT=8000
    volumes:
      - chromadb_hot_data:/chroma/chroma
    networks:
      - mindmap-network
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: '2.0'

  chromadb-warm:
    image: chromadb/chroma:latest
    container_name: chromadb-warm
    ports:
      - "8001:8000"
    environment:
      - CHROMA_SERVER_HOST=0.0.0.0
      - CHROMA_SERVER_HTTP_PORT=8000
    volumes:
      - chromadb_warm_data:/chroma/chroma
    networks:
      - mindmap-network
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'

  chromadb-cold:
    image: chromadb/chroma:latest
    container_name: chromadb-cold
    ports:
      - "8002:8000"
    environment:
      - CHROMA_SERVER_HOST=0.0.0.0
      - CHROMA_SERVER_HTTP_PORT=8000
    volumes:
      - chromadb_cold_data:/chroma/chroma
    networks:
      - mindmap-network
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '0.5'

  # Neo4j图数据库服务
  neo4j-hot:
    image: neo4j:5.15-community
    container_name: neo4j-hot
    ports:
      - "7474:7474"
      - "7687:7687"
    environment:
      - NEO4J_AUTH=neo4j/hotpassword
      - NEO4J_dbms_memory_heap_initial__size=2G
      - NEO4J_dbms_memory_heap_max__size=4G
    volumes:
      - neo4j_hot_data:/data
      - neo4j_hot_logs:/logs
    networks:
      - mindmap-network

  neo4j-warm:
    image: neo4j:5.15-community
    container_name: neo4j-warm
    ports:
      - "7475:7474"
      - "7688:7687"
    environment:
      - NEO4J_AUTH=neo4j/warmpassword
      - NEO4J_dbms_memory_heap_initial__size=1G
      - NEO4J_dbms_memory_heap_max__size=2G
    volumes:
      - neo4j_warm_data:/data
      - neo4j_warm_logs:/logs
    networks:
      - mindmap-network

  neo4j-cold:
    image: neo4j:5.15-community
    container_name: neo4j-cold
    ports:
      - "7476:7474"
      - "7689:7687"
    environment:
      - NEO4J_AUTH=neo4j/coldpassword
      - NEO4J_dbms_memory_heap_initial__size=512M
      - NEO4J_dbms_memory_heap_max__size=1G
    volumes:
      - neo4j_cold_data:/data
      - neo4j_cold_logs:/logs
    networks:
      - mindmap-network

  # PostgreSQL数据库服务
  postgres-hot:
    image: postgres:15
    container_name: postgres-hot
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=mindmap_data_hot
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=hotpassword
      - POSTGRES_SHARED_PRELOAD_LIBRARIES=pg_stat_statements
    volumes:
      - postgres_hot_data:/var/lib/postgresql/data
    networks:
      - mindmap-network
    command: >
      postgres -c max_connections=200
               -c shared_buffers=1GB
               -c effective_cache_size=3GB
               -c work_mem=16MB

  postgres-warm:
    image: postgres:15
    container_name: postgres-warm
    ports:
      - "5433:5432"
    environment:
      - POSTGRES_DB=mindmap_data_warm
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=warmpassword
    volumes:
      - postgres_warm_data:/var/lib/postgresql/data
    networks:
      - mindmap-network
    command: >
      postgres -c max_connections=100
               -c shared_buffers=512MB
               -c effective_cache_size=1GB

  postgres-cold:
    image: postgres:15
    container_name: postgres-cold
    ports:
      - "5434:5432"
    environment:
      - POSTGRES_DB=mindmap_data_cold
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=coldpassword
    volumes:
      - postgres_cold_data:/var/lib/postgresql/data
    networks:
      - mindmap-network
    command: >
      postgres -c max_connections=50
               -c shared_buffers=256MB

  postgres-archive:
    image: postgres:15
    container_name: postgres-archive
    ports:
      - "5435:5432"
    environment:
      - POSTGRES_DB=mindmap_data_archive
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=archivepassword
    volumes:
      - postgres_archive_data:/var/lib/postgresql/data
    networks:
      - mindmap-network

  # Redis缓存服务
  redis-hot:
    image: redis:7-alpine
    container_name: redis-hot
    ports:
      - "6379:6379"
    command: redis-server --maxmemory 2gb --maxmemory-policy allkeys-lru --requirepass hotredispass
    volumes:
      - redis_hot_data:/data
    networks:
      - mindmap-network

  redis-warm:
    image: redis:7-alpine
    container_name: redis-warm
    ports:
      - "6380:6379"
    command: redis-server --maxmemory 1gb --maxmemory-policy allkeys-lru --requirepass warmredispass
    volumes:
      - redis_warm_data:/data
    networks:
      - mindmap-network

  # 监控服务
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    networks:
      - mindmap-network

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
    networks:
      - mindmap-network

volumes:
  chromadb_hot_data:
  chromadb_warm_data:
  chromadb_cold_data:
  neo4j_hot_data:
  neo4j_hot_logs:
  neo4j_warm_data:
  neo4j_warm_logs:
  neo4j_cold_data:
  neo4j_cold_logs:
  postgres_hot_data:
  postgres_warm_data:
  postgres_cold_data:
  postgres_archive_data:
  redis_hot_data:
  redis_warm_data:
  prometheus_data:
  grafana_data:

networks:
  mindmap-network:
    driver: bridge
"""
        return compose_content
    
    def generate_kubernetes_manifests(self) -> Dict[str, str]:
        """生成Kubernetes部署清单"""
        manifests = {}
        
        # ChromaDB热数据层部署
        manifests["chromadb-hot-deployment.yaml"] = """
apiVersion: apps/v1
kind: Deployment
metadata:
  name: chromadb-hot
  labels:
    app: chromadb-hot
    tier: hot
spec:
  replicas: 2
  selector:
    matchLabels:
      app: chromadb-hot
  template:
    metadata:
      labels:
        app: chromadb-hot
        tier: hot
    spec:
      containers:
      - name: chromadb
        image: chromadb/chroma:latest
        ports:
        - containerPort: 8000
        env:
        - name: CHROMA_SERVER_HOST
          value: "0.0.0.0"
        - name: CHROMA_SERVER_HTTP_PORT
          value: "8000"
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
        volumeMounts:
        - name: chromadb-storage
          mountPath: /chroma/chroma
      volumes:
      - name: chromadb-storage
        persistentVolumeClaim:
          claimName: chromadb-hot-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: chromadb-hot-service
spec:
  selector:
    app: chromadb-hot
  ports:
  - port: 8000
    targetPort: 8000
  type: ClusterIP
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: chromadb-hot-pvc
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
  storageClassName: fast-ssd
"""
        
        return manifests


# 全局服务器部署配置实例
server_config = ServerDeploymentConfig()


def main():
    """测试函数"""
    print("服务器部署配置测试")
    
    # 验证配置
    errors = server_config.validate_configs()
    print("配置验证结果:")
    for service, error_list in errors.items():
        if error_list:
            print(f"  {service}: {len(error_list)} 个错误")
            for error in error_list:
                print(f"    - {error}")
        else:
            print(f"  {service}: 配置正常")
    
    # 生成Docker Compose
    print("\n生成Docker Compose配置...")
    compose_content = server_config.generate_docker_compose()
    print(f"Docker Compose配置长度: {len(compose_content)} 字符")
    
    # 生成Kubernetes清单
    print("\n生成Kubernetes清单...")
    k8s_manifests = server_config.generate_kubernetes_manifests()
    print(f"生成了 {len(k8s_manifests)} 个Kubernetes清单文件")


if __name__ == "__main__":
    main()
