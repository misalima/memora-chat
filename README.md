# 🧠 Memora Chat

**Memora** é um sistema de chat inteligente com memória de longo prazo, utilizando **RAG (Retrieval-Augmented Generation)** para recuperar informações relevantes de conversas anteriores e documentos enviados.

![Memora Demo](https://via.placeholder.com/800x400?text=Memora+Demo)

---

## ✨ Funcionalidades

- 🧠 **Memória de Longo Prazo**: Recupera mensagens relevantes de conversas anteriores usando busca vetorial
- 📄 **Upload de Documentos**: Suporte a PDF e TXT - o sistema indexa e permite perguntas sobre o conteúdo
- 🤖 **LLM Integrado**: Gera respostas inteligentes via API (OpenAI / GitHub Copilot)
- 💬 **Múltiplas Conversas**: Crie e gerencie diferentes contextos de conversa
- 🔍 **RAG Completo**: Busca simultânea em mensagens históricas e documentos
- ⚡ **Tempo Real**: Feedback visual durante carregamento e processamento

---

## 🛠️ Tecnologias

### Backend
- **NestJS** - Framework Node.js progressivo
- **TypeScript** - Tipagem estática
- **Prisx   ma** - ORM para SQLite/PostgreSQL
- **ChromaDB** - Banco de dados vetorial local
- **@xenova/transformers** - Embeddings locais (all-MiniLM-L6-v2)
- **Multer** - Upload de arquivos
- **pdf-parse** - Extração de texto de PDFs

### Frontend
- **React 18** + **Vite** - Build rápido
- **TailwindCSS** - Estilização
- **React Router DOM** - Navegação

---

