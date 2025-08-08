from sentence_transformers import SentenceTransformer
from typing import List, Union
import torch
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

class LocalEmbeddingService:
    def __init__(self):
        self.model = None
        self.device = settings.LOCAL_EMBEDDING_DEVICE
        self._load_model()
    
    def _load_model(self):
        try:
            logger.info(f"Loading local embedding model: {settings.LOCAL_EMBEDDING_MODEL}")
            self.model = SentenceTransformer(
                settings.LOCAL_EMBEDDING_MODEL,
                device=self.device
            )
            logger.info(f"Model loaded successfully on device: {self.device}")
        except Exception as e:
            logger.error(f"Failed to load embedding model: {str(e)}")
            raise
    
    def get_embedding(self, text: str) -> List[float]:
        if not self.model:
            raise RuntimeError("Embedding model not loaded")
        
        try:
            embedding = self.model.encode(text, convert_to_tensor=True)
            if isinstance(embedding, torch.Tensor):
                embedding = embedding.cpu().numpy()
            return embedding.tolist()
        except Exception as e:
            logger.error(f"Error generating embedding: {str(e)}")
            raise
    
    def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        if not self.model:
            raise RuntimeError("Embedding model not loaded")
        
        try:
            embeddings = self.model.encode(texts, convert_to_tensor=True, batch_size=32)
            if isinstance(embeddings, torch.Tensor):
                embeddings = embeddings.cpu().numpy()
            return embeddings.tolist()
        except Exception as e:
            logger.error(f"Error generating embeddings: {str(e)}")
            raise
    
    @property
    def embedding_dimension(self) -> int:
        if not self.model:
            return 384  # Default for all-MiniLM-L6-v2
        return self.model.get_sentence_embedding_dimension()
    
    def health_check(self) -> bool:
        try:
            test_embedding = self.get_embedding("test")
            return len(test_embedding) > 0
        except:
            return False

# Global instance
embedding_service = LocalEmbeddingService()