import {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
  Model,
} from "openai/resources/index";
import { OpenRouterConfig } from "../types.js";
import { OpenAIApi } from "./OpenAI.js";
  
  export class OpenRouterApi extends OpenAIApi {
    apiBase: string = "https://openrouter.ai/api/v1";
    constructor(config: OpenRouterConfig) {
      super({
        ...config,
        provider: "openai",
      });
    }
  
    async chatCompletionNonStream(
      body: ChatCompletionCreateParamsNonStreaming,
      signal: AbortSignal,
    ): Promise<ChatCompletion> {
      const response = await this.openai.chat.completions.create(
        this.modifyChatBody(body),
        {
          signal,
        },
      );

      let new_response = response as any;

      let reasoning = new_response.reasoning ?? "";
      let content = new_response.content ?? "";
  
      if (reasoning !== "" && content !== "") {
        // Finished thinking
        new_response.content = `<think>${reasoning}</think>${content}`;
      } else if (reasoning !== "" && content === "") {
        // Unfinished thinking
        new_response.content = `<think>${reasoning}`;
      }
  
      return new_response;
    }
  
    async *chatCompletionStream(
      body: ChatCompletionCreateParamsStreaming,
      signal: AbortSignal,
    ): AsyncGenerator<ChatCompletionChunk, any, unknown> {
      const response = await this.openai.chat.completions.create(
        this.modifyChatBody(body),
        {
          signal,
        },
      );

      let in_reasoning = false;

      for await (const result of response) {
        let new_result = result as any;

        let reasoning = new_result.reasoning ?? "";
        let content = new_result.content ?? "";

        if (reasoning !== "" && content !== "" && !in_reasoning) {
          // Completed thinking in one stream
          new_result.content = `<think>${reasoning}</think>${content}`;
        } else if (reasoning !== "" && content === "" && !in_reasoning) {
          // Started thinking
          new_result.content = `<think>${reasoning}`;
          in_reasoning = true;
        } else if (reasoning !== "" && content === "" && in_reasoning) {
          // continue thinking
          new_result.content = `${reasoning}`;
        } else if (reasoning !== "" && content !== "" && in_reasoning) {
          // Stop reasoning after some choices
          new_result.content = `${reasoning}</think>${content}`;
          in_reasoning = false;
        }
        
        yield new_result;
      }
    }
  
    list(): Promise<Model[]> {
      throw new Error("Method not implemented.");
    }
  }