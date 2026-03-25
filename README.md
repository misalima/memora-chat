# 🧠 Memora Chat

**Memora** é um sistema de chat inteligente com memória de longo prazo, utilizando **RAG (Retrieval-Augmented Generation)** para recuperar informações relevantes de conversas anteriores e documentos enviados.


---

## ✨ Funcionalidades

- 🧠 **Memória de Longo Prazo**: Recupera mensagens relevantes de conversas anteriores usando busca vetorial (Implementação futura)
- 📄 **Upload de Documentos**: Suporte a PDF e TXT - o sistema indexa e permite perguntas sobre o conteúdo (Implementação futura)
- 🤖 **LLM Integrado**: Gera respostas inteligentes via API ( GitHub Copilot)
- 💬 **Múltiplas Conversas**: Crie e gerencie diferentes contextos de conversa
- 🔍 **RAG Completo**: Busca simultânea em mensagens históricas e documentos (Implementação futura)
- ⚡ **Tempo Real**: Feedback visual durante carregamento e processamento

---

## 🛠️ Tecnologias

### Backend
- **NestJS** - Framework Node.js progressivo
- **TypeScript** - Tipagem estática
- **Prisma** - ORM para SQLite/PostgreSQL
- **ChromaDB** - Banco de dados vetorial local (Implementação futura)
- **@xenova/transformers** - Embeddings locais (all-MiniLM-L6-v2) (Implementação futura)
- **Multer** - Upload de arquivos (Implementação futura)
- **pdf-parse** - Extração de texto de PDFs (Implementação futura)

### Frontend
- **React 18** + **Vite** - Build rápido
- **TailwindCSS** - Estilização
- **React Router DOM** - Navegação

---

