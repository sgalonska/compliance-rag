import ollama
from typing import Dict, Any, Optional, Generator
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

class LocalLLMService:
    def __init__(self):
        self.client = ollama.Client(host=settings.OLLAMA_BASE_URL)
        self.model = settings.OLLAMA_MODEL
        self._ensure_model_available()
    
    def _ensure_model_available(self):
        """Ensure the model is downloaded and available"""
        try:
            # Check if model is already available
            models = self.client.list()
            model_names = [model['name'] for model in models.get('models', [])]
            
            if self.model not in model_names:
                logger.info(f"Downloading model: {self.model}")
                self.client.pull(self.model)
                logger.info(f"Model {self.model} downloaded successfully")
            else:
                logger.info(f"Model {self.model} is already available")
        except Exception as e:
            logger.error(f"Error ensuring model availability: {str(e)}")
            raise
    
    def generate_response(
        self, 
        prompt: str, 
        system_prompt: Optional[str] = None,
        temperature: float = 0.1,
        max_tokens: int = 1000
    ) -> str:
        """Generate a response using the local LLM"""
        try:
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            
            response = self.client.chat(
                model=self.model,
                messages=messages,
                options={
                    "temperature": temperature,
                    "num_predict": max_tokens,
                }
            )
            
            return response['message']['content']
        except Exception as e:
            logger.error(f"Error generating response: {str(e)}")
            raise
    
    def generate_response_stream(
        self, 
        prompt: str, 
        system_prompt: Optional[str] = None,
        temperature: float = 0.1,
        max_tokens: int = 1000
    ) -> Generator[str, None, None]:
        """Generate a streaming response using the local LLM"""
        try:
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            
            stream = self.client.chat(
                model=self.model,
                messages=messages,
                options={
                    "temperature": temperature,
                    "num_predict": max_tokens,
                },
                stream=True
            )
            
            for chunk in stream:
                if 'message' in chunk and 'content' in chunk['message']:
                    yield chunk['message']['content']
                    
        except Exception as e:
            logger.error(f"Error generating streaming response: {str(e)}")
            raise
    
    def health_check(self) -> bool:
        """Check if the LLM service is healthy"""
        try:
            response = self.client.list()
            return 'models' in response
        except:
            return False
    
    def get_available_models(self) -> list:
        """Get list of available models"""
        try:
            models = self.client.list()
            return [model['name'] for model in models.get('models', [])]
        except Exception as e:
            logger.error(f"Error getting available models: {str(e)}")
            return []

# Global instance
llm_service = LocalLLMService()