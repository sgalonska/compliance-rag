#!/bin/bash

# Setup Local LLM Models for Compliance RAG System

set -e

echo "🤖 Setting up Local LLM Models for Compliance RAG"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
OLLAMA_HOST=${OLLAMA_HOST:-"http://localhost:11434"}
DEFAULT_LLM_MODEL=${OLLAMA_MODEL:-"llama2"}
DEFAULT_EMBEDDING_MODEL=${OLLAMA_EMBEDDING_MODEL:-"nomic-embed-text"}

# Available models to choose from
declare -A LLM_MODELS=(
    ["llama2"]="Meta's Llama 2 7B - General purpose, good quality"
    ["llama2:13b"]="Meta's Llama 2 13B - Better quality, slower"
    ["codellama"]="Code Llama 7B - Optimized for code and documents"
    ["mistral"]="Mistral 7B - Fast and efficient"
    ["phi"]="Microsoft Phi-2 2.7B - Small but capable"
    ["orca-mini"]="Orca Mini 3B - Lightweight option"
    ["neural-chat"]="Intel Neural Chat 7B - Good for conversations"
)

declare -A EMBEDDING_MODELS=(
    ["nomic-embed-text"]="Nomic Embed Text - Good for documents"
    ["all-minilm"]="All MiniLM L6 v2 - Lightweight embeddings"
)

# Function to check if Ollama is running
check_ollama() {
    echo -e "${BLUE}Checking if Ollama is running...${NC}"
    if curl -s "$OLLAMA_HOST/api/tags" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Ollama is running at $OLLAMA_HOST${NC}"
        return 0
    else
        echo -e "${RED}❌ Ollama is not running at $OLLAMA_HOST${NC}"
        return 1
    fi
}

# Function to wait for Ollama to be ready
wait_for_ollama() {
    echo -e "${YELLOW}⏳ Waiting for Ollama to be ready...${NC}"
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if check_ollama; then
            return 0
        fi
        echo "Attempt $attempt/$max_attempts - Waiting 5 seconds..."
        sleep 5
        ((attempt++))
    done
    
    echo -e "${RED}❌ Ollama did not become ready after $max_attempts attempts${NC}"
    echo "Please make sure Ollama is running:"
    echo "  docker-compose up -d ollama"
    exit 1
}

# Function to list available models
list_models() {
    echo -e "${BLUE}Available LLM Models:${NC}"
    for model in "${!LLM_MODELS[@]}"; do
        echo "  $model - ${LLM_MODELS[$model]}"
    done
    
    echo -e "\n${BLUE}Available Embedding Models:${NC}"
    for model in "${!EMBEDDING_MODELS[@]}"; do
        echo "  $model - ${EMBEDDING_MODELS[$model]}"
    done
}

# Function to pull a model
pull_model() {
    local model_name=$1
    local model_type=${2:-"LLM"}
    
    echo -e "${YELLOW}📥 Pulling $model_type model: $model_name${NC}"
    
    # Use curl to pull model and show progress
    if curl -X POST "$OLLAMA_HOST/api/pull" \
         -H "Content-Type: application/json" \
         -d "{\"name\":\"$model_name\"}" \
         --no-buffer -s | while IFS= read -r line; do
        # Try to parse JSON and show progress
        if echo "$line" | grep -q '"status"'; then
            status=$(echo "$line" | sed -n 's/.*"status":"\([^"]*\)".*/\1/p')
            if [ ! -z "$status" ]; then
                echo -ne "\r${YELLOW}Status: $status${NC}"
            fi
        fi
    done; then
        echo -e "\n${GREEN}✅ Successfully pulled $model_name${NC}"
        return 0
    else
        echo -e "\n${RED}❌ Failed to pull $model_name${NC}"
        return 1
    fi
}

# Function to check if model exists
model_exists() {
    local model_name=$1
    curl -s "$OLLAMA_HOST/api/tags" | grep -q "\"$model_name\""
}

# Function to setup default models
setup_default_models() {
    echo -e "${BLUE}🔧 Setting up default models...${NC}"
    
    # Pull LLM model
    if model_exists "$DEFAULT_LLM_MODEL"; then
        echo -e "${GREEN}✅ LLM model $DEFAULT_LLM_MODEL already exists${NC}"
    else
        if ! pull_model "$DEFAULT_LLM_MODEL" "LLM"; then
            echo -e "${RED}❌ Failed to setup LLM model${NC}"
            return 1
        fi
    fi
    
    # Pull embedding model
    if model_exists "$DEFAULT_EMBEDDING_MODEL"; then
        echo -e "${GREEN}✅ Embedding model $DEFAULT_EMBEDDING_MODEL already exists${NC}"
    else
        if ! pull_model "$DEFAULT_EMBEDDING_MODEL" "Embedding"; then
            echo -e "${RED}❌ Failed to setup embedding model${NC}"
            return 1
        fi
    fi
    
    return 0
}

# Function for interactive model selection
interactive_setup() {
    echo -e "${BLUE}🎛️  Interactive Model Setup${NC}"
    echo "Choose which models to install:"
    
    echo -e "\n${YELLOW}LLM Models:${NC}"
    PS3="Select LLM model (1-${#LLM_MODELS[@]}): "
    select llm_choice in "${!LLM_MODELS[@]}"; do
        if [ -n "$llm_choice" ]; then
            echo "Selected LLM: $llm_choice - ${LLM_MODELS[$llm_choice]}"
            break
        fi
    done
    
    echo -e "\n${YELLOW}Embedding Models:${NC}"
    PS3="Select embedding model (1-${#EMBEDDING_MODELS[@]}): "
    select emb_choice in "${!EMBEDDING_MODELS[@]}"; do
        if [ -n "$emb_choice" ]; then
            echo "Selected Embedding: $emb_choice - ${EMBEDDING_MODELS[$emb_choice]}"
            break
        fi
    done
    
    echo -e "\n${BLUE}Installing selected models...${NC}"
    
    # Install selected models
    if ! model_exists "$llm_choice"; then
        pull_model "$llm_choice" "LLM"
    else
        echo -e "${GREEN}✅ LLM model $llm_choice already exists${NC}"
    fi
    
    if ! model_exists "$emb_choice"; then
        pull_model "$emb_choice" "Embedding"
    else
        echo -e "${GREEN}✅ Embedding model $emb_choice already exists${NC}"
    fi
    
    # Update environment file
    echo -e "\n${BLUE}📝 Updating configuration...${NC}"
    if [ -f "../backend/.env" ]; then
        sed -i.bak "s/OLLAMA_MODEL=.*/OLLAMA_MODEL=$llm_choice/" ../backend/.env
        sed -i.bak "s/OLLAMA_EMBEDDING_MODEL=.*/OLLAMA_EMBEDDING_MODEL=$emb_choice/" ../backend/.env
        echo -e "${GREEN}✅ Updated backend/.env with selected models${NC}"
    else
        echo -e "${YELLOW}⚠️  backend/.env not found. Please update manually:${NC}"
        echo "  OLLAMA_MODEL=$llm_choice"
        echo "  OLLAMA_EMBEDDING_MODEL=$emb_choice"
    fi
}

# Function to show installed models
show_installed_models() {
    echo -e "${BLUE}📋 Currently installed models:${NC}"
    if curl -s "$OLLAMA_HOST/api/tags" | grep -q "models"; then
        curl -s "$OLLAMA_HOST/api/tags" | \
            grep -o '"name":"[^"]*"' | \
            sed 's/"name":"\([^"]*\)"/  ✅ \1/' | \
            sort
    else
        echo -e "${YELLOW}⚠️  No models found or unable to connect to Ollama${NC}"
    fi
}

# Function to test models
test_models() {
    echo -e "${BLUE}🧪 Testing installed models...${NC}"
    
    # Test LLM
    echo -e "\n${YELLOW}Testing LLM model: $DEFAULT_LLM_MODEL${NC}"
    local test_response=$(curl -s -X POST "$OLLAMA_HOST/api/generate" \
        -H "Content-Type: application/json" \
        -d "{\"model\":\"$DEFAULT_LLM_MODEL\",\"prompt\":\"Hello, this is a test. Respond with just 'OK' if you receive this.\",\"stream\":false}" | \
        grep -o '"response":"[^"]*"' | \
        sed 's/"response":"\([^"]*\)"/\1/')
    
    if [ ! -z "$test_response" ]; then
        echo -e "${GREEN}✅ LLM test successful: $test_response${NC}"
    else
        echo -e "${RED}❌ LLM test failed${NC}"
    fi
    
    # Test embedding model
    echo -e "\n${YELLOW}Testing embedding model: $DEFAULT_EMBEDDING_MODEL${NC}"
    local embed_response=$(curl -s -X POST "$OLLAMA_HOST/api/embeddings" \
        -H "Content-Type: application/json" \
        -d "{\"model\":\"$DEFAULT_EMBEDDING_MODEL\",\"prompt\":\"test embedding\"}")
    
    if echo "$embed_response" | grep -q "embedding"; then
        echo -e "${GREEN}✅ Embedding test successful${NC}"
    else
        echo -e "${RED}❌ Embedding test failed${NC}"
    fi
}

# Main execution
main() {
    echo -e "${GREEN}Welcome to Local LLM Setup!${NC}"
    echo "This script will help you set up local models for your Compliance RAG system."
    echo ""
    
    # Wait for Ollama to be ready
    if ! wait_for_ollama; then
        exit 1
    fi
    
    # Parse command line arguments
    case "${1:-default}" in
        "list")
            list_models
            ;;
        "interactive")
            interactive_setup
            ;;
        "test")
            test_models
            ;;
        "status")
            show_installed_models
            ;;
        "default"|"")
            echo -e "${BLUE}Setting up default models...${NC}"
            if setup_default_models; then
                echo -e "\n${GREEN}🎉 Setup completed successfully!${NC}"
                echo -e "${BLUE}📝 Default configuration:${NC}"
                echo "  LLM Model: $DEFAULT_LLM_MODEL"
                echo "  Embedding Model: $DEFAULT_EMBEDDING_MODEL"
                echo ""
                echo -e "${BLUE}🚀 You can now start the application with:${NC}"
                echo "  make dev"
                
                # Run tests
                test_models
            else
                echo -e "${RED}❌ Setup failed${NC}"
                exit 1
            fi
            ;;
        "help"|"-h"|"--help")
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  default     - Setup default models (llama2 + nomic-embed-text)"
            echo "  interactive - Interactive model selection"
            echo "  list        - List available models"
            echo "  status      - Show currently installed models"
            echo "  test        - Test installed models"
            echo "  help        - Show this help"
            ;;
        *)
            echo -e "${RED}Unknown command: $1${NC}"
            echo "Run '$0 help' for usage information"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"