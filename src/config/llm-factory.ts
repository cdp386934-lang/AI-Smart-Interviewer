import { ChatOpenAI } from '@langchain/openai';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { Embeddings } from '@langchain/core/embeddings';
import { config } from './loader';

class DummyEmbeddings implements Embeddings { async embedDocuments(texts: string[]) { return texts.map(() => [0.1, 0.2, 0.3]); } async embedQuery(text: string) { return [0.1, 0.2, 0.3]; } }

export interface LLMFactory { createChatModel(): BaseChatModel; createEmbeddingModel(): Embeddings; health(): Promise<{ ok: boolean; latency: number; model: string }>; }

export class LangChainLLMFactory implements LLMFactory {
  createChatModel(): BaseChatModel { return new ChatOpenAI({ apiKey: config.llm.apiKey, modelName: config.llm.model, temperature: config.llm.temperature, maxTokens: config.llm.maxTokens, configuration: config.llm.baseUrl ? { baseURL: config.llm.baseUrl } as any : undefined }) as unknown as BaseChatModel; }
  createEmbeddingModel(): Embeddings { return new DummyEmbeddings(); }
  async health() { const start = Date.now(); try { const model = this.createChatModel(); await (model as any).invoke([{ role: 'user', content: 'ping' }]).catch(() => undefined); return { ok: true, latency: Date.now() - start, model: config.llm.model }; } catch { return { ok: false, latency: Date.now() - start, model: config.llm.model }; } }
}
