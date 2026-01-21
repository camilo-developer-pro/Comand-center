\# Version 2.0 Specification: The Neural Enterprise

\#\# 1\. System Architecture

\#\#\# 1.1 New Modules  
\- \*\*/modules/filesystem\*\*: Handles \`ltree\` logic, fractional indexing, drag-and-drop, and sidebar RSC.  
\- \*\*/modules/ai\*\*: Encapsulates Vercel AI SDK, RAG pipeline, and Vector Store interactions.  
\- \*\*/modules/graph\*\*: Manages \`entity\_edges\`, visualization components, and traversal algorithms.  
\- \*\*/modules/analytics\*\*: Manages Materialized Views and \`pg\_cron\` schedules.

\---

\#\# 2\. Database Schema Extensions

\#\#\# 2.1 File System (Ltree)  
\- \*\*Table\*\*: \`items\` (Replaces flat documents list).  
\- \*\*Column\*\*: \`path\` (type \`ltree\`).  
\- \*\*Index\*\*: GiST on \`path\`.  
\- \*\*Constraint\*\*: Unique path per workspace.

\#\#\# 2.2 Semantic Brain (Pgvector)  
\- \*\*Table\*\*: \`document\_embeddings\`.  
\- \*\*Index\*\*: HNSW on \`embedding\`.  
\- \*\*Logic\*\*: Semantic Chunking (Header-aware).  
\- \*\*RLS\*\*: Inherits from parent document.

\#\#\# 2.3 Knowledge Graph  
\- \*\*Table\*\*: \`entity\_edges\` (Polymorphic adjacency list).  
\- \*\*Logic\*\*: Automatic backlink extraction triggers on documents update.  
\- \*\*Constraints\*\*: Unique constraint on \`(source, target, relation)\`.

\---

\#\# 3\. Security Model V2 (Graph-Aware)  
\- \*\*Edge Security\*\*: Users can only traverse edges where they have read access to BOTH \`source\_id\` and \`target\_id\`.  
\- \*\*Vector Security\*\*: The \`match\_documents\` RPC must accept \`workspace\_id\` and apply it to the \`WHERE\` clause.

\---

\#\# 4\. Acceptance Criteria  
\- \*\*Hierarchy\*\*: Moving a folder with 1,000 items completes in \<200ms (Database Transaction time).  
\- \*\*Intelligence\*\*: "Ask AI" returns answers cited from specific document sections (RAG) with \<2s latency.  
\- \*\*Graph\*\*: Visualizing 5,000 nodes maintains 60fps (WebGL) on standard hardware.  
\- \*\*Analytics\*\*: Dashboard loads in \<100ms (hitting Materialized View).  
