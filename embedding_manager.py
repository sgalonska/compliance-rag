from document_processor import DocumentProcessor
from qdrant_client import QdrantVectorStore
from typing import List, Dict, Any
from pathlib import Path
import os

class EmbeddingManager:
    def __init__(self):
        self.document_processor = DocumentProcessor()
        self.vector_store = QdrantVectorStore()
        
    def setup_collection(self):
        self.vector_store.create_collection()
        
    def process_and_store_documents(self, file_paths: List[str]) -> Dict[str, int]:
        results = {"processed": 0, "stored": 0, "errors": 0}
        
        all_documents = []
        
        for file_path in file_paths:
            try:
                if os.path.isfile(file_path):
                    documents = self.document_processor.process_file(file_path)
                elif os.path.isdir(file_path):
                    documents = self.document_processor.process_directory(file_path)
                else:
                    print(f"Path not found: {file_path}")
                    results["errors"] += 1
                    continue
                
                all_documents.extend(documents)
                results["processed"] += 1
                print(f"Processed {file_path}: {len(documents)} chunks")
                
            except Exception as e:
                print(f"Error processing {file_path}: {str(e)}")
                results["errors"] += 1
        
        if all_documents:
            try:
                doc_dicts = []
                for doc in all_documents:
                    doc_dicts.append({
                        "content": doc.page_content,
                        "metadata": doc.metadata
                    })
                
                self.vector_store.add_documents(doc_dicts)
                results["stored"] = len(all_documents)
                
            except Exception as e:
                print(f"Error storing documents: {str(e)}")
                results["errors"] += 1
        
        return results
    
    def search_documents(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        return self.vector_store.search(query, limit)
    
    def get_collection_stats(self):
        return self.vector_store.get_collection_info()