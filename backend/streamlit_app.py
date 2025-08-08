import streamlit as st
import os
from pathlib import Path
from rag_pipeline import ComplianceRAG
import tempfile

st.set_page_config(
    page_title="Compliance RAG Assistant", 
    page_icon="📋",
    layout="wide"
)

@st.cache_resource
def get_rag_pipeline():
    return ComplianceRAG()

def main():
    st.title("📋 Compliance RAG Assistant")
    st.markdown("Ask questions about your compliance documents stored in Qdrant")
    
    rag = get_rag_pipeline()
    
    tab1, tab2, tab3 = st.tabs(["💬 Chat", "📤 Upload Documents", "📊 Collection Stats"])
    
    with tab1:
        st.header("Ask Compliance Questions")
        
        question = st.text_area(
            "Enter your compliance question:",
            placeholder="e.g., What are the data retention requirements for customer information?",
            height=100
        )
        
        col1, col2 = st.columns([1, 4])
        
        with col1:
            context_limit = st.selectbox("Number of sources to use:", [3, 5, 7, 10], index=1)
        
        if st.button("🔍 Get Answer", type="primary"):
            if question:
                with st.spinner("Searching compliance documents..."):
                    result = rag.generate_compliance_answer(question, context_limit)
                
                st.subheader("📝 Answer:")
                st.write(result["answer"])
                
                if result["sources"]:
                    st.subheader("📚 Sources:")
                    for i, source in enumerate(result["sources"], 1):
                        with st.expander(f"Source {i}: {source['file_name']} (Score: {source['relevance_score']:.3f})"):
                            st.write(f"**File:** {source['file_name']}")
                            st.write(f"**Chunk ID:** {source['chunk_id']}")
                            st.write(f"**Relevance Score:** {source['relevance_score']:.3f}")
                
                st.info(f"Used {result['context_used']} document chunks for this answer")
            else:
                st.warning("Please enter a question.")
    
    with tab2:
        st.header("Upload Compliance Documents")
        
        uploaded_files = st.file_uploader(
            "Choose compliance documents",
            type=['pdf', 'docx', 'xlsx', 'xls'],
            accept_multiple_files=True
        )
        
        if uploaded_files:
            st.write(f"Selected {len(uploaded_files)} files:")
            for file in uploaded_files:
                st.write(f"- {file.name}")
        
        if st.button("📤 Process and Store Documents"):
            if uploaded_files:
                with st.spinner("Processing and storing documents..."):
                    file_paths = []
                    
                    for uploaded_file in uploaded_files:
                        with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{uploaded_file.name}") as tmp_file:
                            tmp_file.write(uploaded_file.getbuffer())
                            file_paths.append(tmp_file.name)
                    
                    try:
                        results = rag.add_documents(file_paths)
                        
                        st.success("Documents processed successfully!")
                        st.write(f"**Processed:** {results['processed']} files")
                        st.write(f"**Stored:** {results['stored']} document chunks")
                        if results['errors'] > 0:
                            st.warning(f"**Errors:** {results['errors']} files had processing errors")
                    
                    except Exception as e:
                        st.error(f"Error processing documents: {str(e)}")
                    
                    finally:
                        for file_path in file_paths:
                            try:
                                os.unlink(file_path)
                            except:
                                pass
            else:
                st.warning("Please select files to upload.")
    
    with tab3:
        st.header("Collection Statistics")
        
        if st.button("🔄 Refresh Stats"):
            try:
                stats = rag.get_collection_stats()
                if stats:
                    st.success("Collection is active!")
                    st.json(stats.dict() if hasattr(stats, 'dict') else str(stats))
                else:
                    st.warning("Collection not found or not accessible.")
            except Exception as e:
                st.error(f"Error getting collection stats: {str(e)}")
        
        st.subheader("💡 Setup Instructions")
        st.markdown("""
        1. **Environment Setup**: Make sure your `.env` file contains:
           - `QDRANT_URL`: Your Qdrant cluster URL
           - `QDRANT_API_KEY`: Your Qdrant API key
           - `OPENAI_API_KEY`: Your OpenAI API key
           - `COLLECTION_NAME`: Name for your document collection
        
        2. **Initialize Collection**: Use the upload tab to add your first documents
        
        3. **Start Chatting**: Ask questions about your compliance documents
        """)

if __name__ == "__main__":
    if not all([
        os.getenv("QDRANT_URL"),
        os.getenv("QDRANT_API_KEY"), 
        os.getenv("OPENAI_API_KEY")
    ]):
        st.error("⚠️ Please set up your environment variables in the .env file")
        st.stop()
    
    main()