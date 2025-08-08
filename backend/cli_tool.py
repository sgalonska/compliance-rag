#!/usr/bin/env python3
import argparse
import sys
from pathlib import Path
from rag_pipeline import ComplianceRAG

def main():
    parser = argparse.ArgumentParser(description="Compliance RAG CLI Tool")
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    setup_parser = subparsers.add_parser('setup', help='Initialize the Qdrant collection')
    
    upload_parser = subparsers.add_parser('upload', help='Upload documents to the collection')
    upload_parser.add_argument('paths', nargs='+', help='File or directory paths to upload')
    
    query_parser = subparsers.add_parser('query', help='Query the compliance documents')
    query_parser.add_argument('question', help='Question to ask')
    query_parser.add_argument('--limit', type=int, default=5, help='Number of sources to use')
    
    stats_parser = subparsers.add_parser('stats', help='Show collection statistics')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    rag = ComplianceRAG()
    
    try:
        if args.command == 'setup':
            print("Setting up Qdrant collection...")
            rag.setup()
            print("✅ Collection setup complete!")
        
        elif args.command == 'upload':
            print(f"Processing {len(args.paths)} paths...")
            results = rag.add_documents(args.paths)
            
            print("📊 Upload Results:")
            print(f"  Processed: {results['processed']} files")
            print(f"  Stored: {results['stored']} document chunks")
            if results['errors'] > 0:
                print(f"  Errors: {results['errors']} files failed")
        
        elif args.command == 'query':
            print(f"🔍 Searching for: {args.question}")
            result = rag.generate_compliance_answer(args.question, args.limit)
            
            print("\n📝 Answer:")
            print(result["answer"])
            
            if result["sources"]:
                print(f"\n📚 Sources (used {result['context_used']} chunks):")
                for i, source in enumerate(result["sources"], 1):
                    print(f"  {i}. {source['file_name']} (score: {source['relevance_score']:.3f})")
        
        elif args.command == 'stats':
            print("📊 Collection Statistics:")
            stats = rag.get_collection_stats()
            if stats:
                print(f"Collection exists and is accessible")
                print(stats)
            else:
                print("Collection not found or not accessible")
    
    except Exception as e:
        print(f"❌ Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()