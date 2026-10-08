import os
from typing import List, Dict, Any
from app.core.config import settings

class KnowledgeBaseVectorStore:
    """
    Modular Vector Store for Knowledge Base semantic retrieval (ChromaDB primary, FAISS swappable).
    """

    def __init__(self):
        self.chroma_path = settings.CHROMADB_PATH
        os.makedirs(self.chroma_path, exist_ok=True)
        self._init_db()

    def _init_db(self):
        try:
            import chromadb
            self.client = chromadb.PersistentClient(path=self.chroma_path)
            self.collection = self.client.get_or_create_collection(name="placex_knowledge")
            self._seed_initial_knowledge()
            self.available = True
        except Exception:
            # Fallback in-memory store if chromadb binary is not installed yet
            self.available = False
            self.documents = [
                {"id": "1", "title": "Google SDE Interview Guide", "content": "Google focuses heavily on Data Structures & Algorithms, specifically Graphs, Dynamic Programming, and System Design.", "category": "company_prep"},
                {"id": "2", "title": "ATS Resume Best Practices", "content": "Quantify bullet points with impact metrics. Use standard section headers like Experience, Projects, and Education.", "category": "resume_tips"},
                {"id": "3", "title": "System Design Fundamentals", "content": "Load Balancing, Database Sharding, Caching with Redis, and Microservices Architecture.", "category": "system_design"}
            ]

    def _seed_initial_knowledge(self):
        if not self.available:
            return
        if self.collection.count() == 0:
            docs = [
                "Google focuses heavily on Data Structures & Algorithms, specifically Graphs, Dynamic Programming, and System Design.",
                "Quantify bullet points with impact metrics. Use standard section headers like Experience, Projects, and Education.",
                "System Design Fundamentals: Load Balancing, Database Sharding, Caching with Redis, and Microservices Architecture."
            ]
            metadatas = [
                {"title": "Google SDE Interview Guide", "category": "company_prep"},
                {"title": "ATS Resume Best Practices", "category": "resume_tips"},
                {"title": "System Design Fundamentals", "category": "system_design"}
            ]
            ids = ["doc_1", "doc_2", "doc_3"]
            self.collection.add(documents=docs, metadatas=metadatas, ids=ids)

    def search_knowledge(self, query: str, limit: int = 3) -> List[Dict[str, Any]]:
        if self.available:
            try:
                results = self.collection.query(query_texts=[query], n_results=limit)
                docs = []
                if results and 'documents' in results and results['documents']:
                    for i in range(len(results['documents'][0])):
                        docs.append({
                            "content": results['documents'][0][i],
                            "metadata": results['metadatas'][0][i] if 'metadatas' in results else {}
                        })
                return docs
            except Exception:
                pass
        
        # In-memory keyword match fallback
        query_lower = query.lower()
        matched = []
        for doc in self.documents:
            if any(word in doc['content'].lower() or word in doc['title'].lower() for word in query_lower.split()):
                matched.append({"content": doc['content'], "metadata": {"title": doc['title'], "category": doc['category']}})
        return matched[:limit] if matched else [{"content": self.documents[0]['content'], "metadata": {"title": self.documents[0]['title']}}]
