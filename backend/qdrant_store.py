from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from qdrant_client.http import models
from typing import List, Dict, Any
import openai
from config import QDRANT_URL, QDRANT_API_KEY, OPENAI_API_KEY, COLLECTION_NAME, EMBEDDING_MODEL
import uuid

class QdrantVectorStore:
    def __init__(self):
        self.client = QdrantClient(
            url=QDRANT_URL,
            api_key=QDRANT_API_KEY,
        )
        self.collection_name = COLLECTION_NAME
        openai.api_key = OPENAI_API_KEY
        
    def create_collection(self, vector_size: int = 1536):
        try:
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
            )
            print(f"Collection '{self.collection_name}' created successfully")
        except Exception as e:
            if "already exists" in str(e).lower():
                print(f"Collection '{self.collection_name}' already exists")
            else:
                raise e
    
    def get_embedding(self, text: str) -> List[float]:
        response = openai.embeddings.create(
            input=text,
            model=EMBEDDING_MODEL
        )
        return response.data[0].embedding
    
    def add_documents(self, documents: List[Dict[str, Any]]):
        points = []
        for doc in documents:
            embedding = self.get_embedding(doc['content'])
            point = PointStruct(
                id=str(uuid.uuid4()),
                vector=embedding,
                payload={
                    "content": doc['content'],
                    "metadata": doc['metadata']
                }
            )
            points.append(point)
        
        self.client.upsert(
            collection_name=self.collection_name,
            points=points
        )
        print(f"Added {len(points)} documents to collection")
    
    def search(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        query_embedding = self.get_embedding(query)
        
        search_result = self.client.search(
            collection_name=self.collection_name,
            query_vector=query_embedding,
            limit=limit,
            with_payload=True
        )
        
        results = []
        for result in search_result:
            results.append({
                "content": result.payload["content"],
                "metadata": result.payload["metadata"],
                "score": result.score
            })
        
        return results
    
    def delete_collection(self):
        self.client.delete_collection(collection_name=self.collection_name)
        print(f"Collection '{self.collection_name}' deleted")
    
    def get_collection_info(self):
        try:
            info = self.client.get_collection(collection_name=self.collection_name)
            return info
        except Exception as e:
            print(f"Collection info error: {e}")
            return None