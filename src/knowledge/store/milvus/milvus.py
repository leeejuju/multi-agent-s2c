from typing import Any

from pymilvus import (
    AsyncMilvusClient,
    Collection,
    CollectionSchema,
    DataType,
    FieldSchema,
    Function,
    FunctionType,
)
from pymilvus.milvus_client.index import IndexParam

from src.configs.config import config
from src.knowledge.base import BaseKnowledge, KnowledgeRecord, KnowledgeSearch


class MilvusKnowledge(BaseKnowledge):
    name: str = "Milvus数据库"
    description: str = "test"

    def __init__(self, **kwargs) -> None:
        self.milvus_uri = kwargs.get("milvus_uri", None)
        self.milvus_token = kwargs.get("milvus_token", None)
        self.milvus_client: AsyncMilvusClient = None
        self.milvus_collection: dict[str, Any] = {}
        self.milvus_db = kwargs.get("milvus_db", None)
        self._connect_initializer()

    def _connect_initializer(self):
        try:
            self.milvus_client = AsyncMilvusClient(uri=self.milvus_uri, token=self.milvus_token)
            try:
                if self.milvus_db and self.milvus_client.list_databases():
                    self.milvus_client.create_database(self.milvus_db)
                self.milvus_client.using_database(self.milvus_db)
            except Exception as e:
                print(f"Error occurred while creating or using database: {e}")
        except Exception as e:
            print(f"Error occurred while initializing Milvus client: {e}")

    async def _create_collection(self, collection_name: str, dimension: int) -> Collection:
        """
        创建集合.
        """
        fields = [
            FieldSchema(name="id", dtype=DataType.VARCHAR, max_length=100, is_primary=True),
            FieldSchema(name="chunk", dtype=DataType.VARCHAR, max_length=65535, enable_analyzer=True, analyzer_params={"type": "chinese"}, description="文本"),
            FieldSchema(name="chunk_sparse", dtype=DataType.SPARSE_FLOAT_VECTOR, description="存储chunk拆分的稀疏vec"),
            FieldSchema(name="chunk_id", dtype=DataType.VARCHAR, max_length=100, description="chunk归属"),
            FieldSchema(name="chunk_index", dtype=DataType.INT64, description="chunk在file_id对应的顺序"),
            FieldSchema(name="file_id", dtype=DataType.VARCHAR, max_length=100, description="文件id"),
            FieldSchema(name="chunk_embeding", dtype=DataType.FLOAT_VECTOR, dimension=dimension, description="chunk的vec"),
        ]
        bm25_function = Function(name="chunk_embeding_bm25", input_field_names=["chunk"], output_field_names=["chunk_sparse"], function_type=FunctionType.BM25)

        index_param = [
            IndexParam(
                field_name="chunk",
                index_name="chunk_index_params",
                index_type="IVF_FLAT",
                metric_type="COSINE",
            ),
            IndexParam(field_name="chunk_sparse", index_name="chunk_sparse_index_params", index_type="SPARSE_INVERTED_INDEX", metric_type="BM25", params={"inverted_index_algo": "DAAT_MAXSCORE"}),
        ]
        collection_schema = CollectionSchema(fields=fields, functions=[bm25_function], description="定义类型")
        collection = await self.milvus_client.create_collection(collection_name=collection_name, schema=collection_schema, index_params=index_param)

        return collection

    async def _get_milvus_collection(self, kb_id: str):

        if kb_id in self.milvus_collection:
            return self.milvus_collection[kb_id]

        # 查看 kb_id是否存在
        if self.milvus_client.has_collection(collection_name=kb_id):
            return kb_id
        
        # 没有就创建
        collection = await self._create_collection(collection_name=kb_id, dimension=1024)
        return collection

    async def build_file_index(self, kb_id: str, file_id: str, params: dict | None = None) -> dict:
        """
        根据markdown文件创建文件索引.
        """
        if not kb_id:
            raise ValueError("")

        collection = await self._get_milvus_collection(kb_id)
        
        
