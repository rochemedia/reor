import OpenAI from "openai";
import {
  ChatbotMessage,
  ISendFunctionImplementer,
  IChatSessionService,
  OpenAIMessage,
} from "../Types";
import { Tiktoken, TiktokenModel, encodingForModel } from "js-tiktoken";
import { OpenAILLMConfig } from "electron/main/Store/storeConfig";
import {
  RequestInfo as NodeFetchRequestInfo,
  RequestInit as NodeFetchRequestInit,
  Response as NodeFetchResponse,
} from "electron-fetch";
import { default as electronFetch } from "electron-fetch";

// import fetch from electron-fetch under a different name
// import fetch from "electron-fetch";
// import fetch from "node-fetch";

import { Fetch } from "openai/core";
// import fetch from 'electron-fetch'
// import fetch from "node-fetch";
// import { customFetchUsingElectronNet } from "../../download/download";
// import { IncomingMessage } from "electron/main";

// Adapter for the Response type

import { net } from "electron";
import { ClientRequestConstructorOptions } from "electron/main";

class StreamResponse {
  private _statusCode: number;
  private _statusMessage: string;
  private _headers: Headers;
  public body: ReadableStream;

  constructor(
    statusCode: number,
    statusMessage: string,
    headers: Headers,
    body: ReadableStream
  ) {
    this._statusCode = statusCode;
    this._statusMessage = statusMessage;
    this._headers = headers;
    this.body = body;
  }

  get status() {
    return this._statusCode;
  }

  get statusText() {
    return this._statusMessage;
  }

  get headers() {
    return this._headers;
  }

  // You can add more methods here to mimic the Response interface as needed
}

import { EventEmitter } from "events";
export const customFetchUsingElectronNet = async (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<StreamResponse> => {
  const url = input instanceof URL ? input.href : input.toString();
  const options = init || {};

  return new Promise((resolve, reject) => {
    const requestOptions: ClientRequestConstructorOptions = {
      method: options.method || "GET",
      url: url,
    };

    // ... [rest of your code for setting up the request, ignoring agent, handling headers, and body]

    const request = net.request(requestOptions);

    request.on("response", (response) => {
      const reader = new ReadableStream({
        start(controller) {
          response.on("data", (chunk) => {
            controller.enqueue(new Uint8Array(chunk));
          });

          response.on("end", () => {
            controller.close();
          });
        },
      });

      resolve(
        new StreamResponse(
          response.statusCode || 0,
          response.statusMessage || "",
          new Headers(response.headers as any),
          reader
        )
      );
    });

    request.on("error", (error) => {
      reject(error);
    });

    request.end();
  });
};

const customFetch: Fetch = (
  url: RequestInfo,
  init?: RequestInit
): Promise<Response> => {
  // Convert or adapt the `url` and `init` to the types expected by node-fetch if necessary
  const adaptedUrl: NodeFetchRequestInfo =
    url as unknown as NodeFetchRequestInfo;
  const adaptedInit: NodeFetchRequestInit =
    init as unknown as NodeFetchRequestInit;

  // Call the node-fetch function with adapted arguments
  return electronFetch(adaptedUrl, adaptedInit) as unknown as Promise<Response>;
};

export const customFetchUsingElectronNet2 = async (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> => {
  const url = input instanceof URL ? input.href : input.toString();
  const options = init || {};

  return new Promise((resolve, reject) => {
    const requestOptions: ClientRequestConstructorOptions = {
      method: options.method || "GET",
      url: url,
    };

    const request = net.request(requestOptions);

    // Set headers, ignoring the 'agent' property
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== "agent") {
          // Skip 'agent'
          request.setHeader(key, value as string);
        }
      });
    }

    // Handle request body
    if (options.body) {
      let bodyData;
      if (options.body instanceof ArrayBuffer) {
        bodyData = Buffer.from(options.body);
      } else if (
        typeof options.body === "string" ||
        Buffer.isBuffer(options.body)
      ) {
        bodyData = options.body;
      } else if (typeof options.body === "object") {
        bodyData = JSON.stringify(options.body);
        request.setHeader("Content-Type", "application/json");
      } else {
        reject(new Error("Unsupported body type"));
        return;
      }
      request.write(bodyData);
    }

    request.on("response", (response) => {
      const reader = new ReadableStream({
        start(controller) {
          response.on("data", (chunk) => {
            controller.enqueue(new Uint8Array(chunk));
          });

          response.on("end", () => {
            controller.close();
          });
        },
      });

      const newResponse = new Response(reader, {
        status: response.statusCode || 0,
        statusText: response.statusMessage || "",
        headers: new Headers(response.headers as any),
      });

      resolve(newResponse);
    });

    request.on("error", (error) => {
      reject(error);
    });

    request.end();
  });
};

export const customFetchUsingElectronNetNonStreaming = async (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> => {
  const url = input instanceof URL ? input.href : input.toString();
  const options = init || {};

  return new Promise((resolve, reject) => {
    const requestOptions: ClientRequestConstructorOptions = {
      method: options.method || "GET",
      url: url,
    };

    // Ignore the 'agent' property from 'init' as it's not relevant for Electron's net module
    if ("agent" in options) {
      delete options.agent;
    }

    const request = net.request(requestOptions);

    // Set headers, except for 'content-length' which will be set automatically
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== "content-length") {
          // Skip 'content-length'
          request.setHeader(key, value as string);
        }
      });
    }

    // Handle request body
    if (options.body) {
      let bodyData;
      if (options.body instanceof ArrayBuffer) {
        bodyData = Buffer.from(options.body);
      } else if (
        typeof options.body === "string" ||
        Buffer.isBuffer(options.body)
      ) {
        bodyData = options.body;
      } else if (typeof options.body === "object") {
        bodyData = JSON.stringify(options.body);
        request.setHeader("Content-Type", "application/json");
      } else {
        reject(new Error("Unsupported body type"));
        return;
      }
      request.write(bodyData);
    }

    request.on("response", (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk) => chunks.push(chunk as Buffer));
      response.on("end", () => {
        const buffer = Buffer.concat(chunks);
        resolve(
          new Response(buffer, {
            status: response.statusCode,
            statusText: response.statusMessage,
            headers: new Headers(response.headers as any),
          })
        );
      });
    });

    request.on("error", (error) => {
      console.error("Request error:", error); // Improved error logging
      reject(error);
    });

    request.end();
  });
};

export class OpenAIModelSessionService implements IChatSessionService {
  private openai: OpenAI;
  public modelName: string;
  private messageHistory: ChatbotMessage[];
  private abortStreaming: boolean = false;
  private tokenEncoding: Tiktoken;
  private modelConfig: OpenAILLMConfig;

  constructor(modelName: string, modelConfig: OpenAILLMConfig) {
    this.openai = new OpenAI({
      apiKey: modelConfig.apiKey,
      baseURL: modelConfig.apiURL,
      fetch: customFetchUsingElectronNetStreaming,
    });
    this.modelConfig = modelConfig;
    this.modelName = modelName;
    this.messageHistory = [];
    try {
      this.tokenEncoding = encodingForModel(modelName as TiktokenModel);
    } catch (e) {
      this.tokenEncoding = encodingForModel("gpt-3.5-turbo-1106"); // hack while we think about what to do with custom remote models' tokenizers
    }
  }

  async init(): Promise<void> {
    // Since there's no model loading process for OpenAI, we can consider it initialized here
  }

  private isModelLoaded(): boolean {
    // For API-based models, this can always return true as there's no "loading" process
    return true;
  }

  public tokenize = (text: string): number[] => {
    return this.tokenEncoding.encode(text);
  };

  public getContextLength(): number {
    return this.modelConfig.contextLength || 0;
  }

  public abort(): void {
    this.abortStreaming = true;
  }

  async streamingPrompt(
    prompt: string,
    sendFunctionImplementer: ISendFunctionImplementer,
    ignoreChatHistory?: boolean
  ): Promise<string> {
    if (!this.isModelLoaded()) {
      throw new Error("Model not initialized");
    }
    this.abortStreaming = false;

    if (ignoreChatHistory) {
      this.messageHistory = [];
    }

    // Add the user's prompt to the message history
    this.messageHistory.push({
      role: "user",
      content: prompt,
      messageType: "success",
    });

    try {
      const openAIMessages = this.messageHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })) as OpenAIMessage[];

      const stream = await this.openai.chat.completions.create({
        model: this.modelName,
        messages: openAIMessages,
        stream: true,
      });

      let result = "";
      for await (const chunk of stream) {
        if (this.abortStreaming) {
          break; // Exit the loop if the flag is set
        }
        const content = chunk.choices[0]?.delta?.content || "";
        result += content;

        // Update the message history with the response
        this.messageHistory.push({
          role: "assistant",
          content,
          messageType: "success",
        });

        sendFunctionImplementer.send("tokenStream", {
          messageType: "success",
          content,
        });
      }

      return result;
    } catch (error) {
      console.error("Error during OpenAI streaming session:", error);
      sendFunctionImplementer.send("tokenStream", {
        messageType: "error",
        content: "Error during OpenAI streaming session: " + error + "\n",
      });
      return "error";
    }
  }
}

// export const customFetchUsingElectronNet = async (
//   input: RequestInfo | URL,
//   init?: RequestInit
// ): Promise<Response> => {
//   const url = input instanceof URL ? input.href : input.toString();
//   const options = init || {};

//   return new Promise((resolve, reject) => {
//     const requestOptions: ClientRequestConstructorOptions = {
//       method: options.method || "GET",
//       url: url,
//     };

//     // Ignore the 'agent' property from 'init' as it's not relevant for Electron's net module
//     if ("agent" in options) {
//       delete options.agent;
//     }

//     const request = net.request(requestOptions);

//     // Set headers, except for 'content-length' which will be set automatically
//     if (options.headers) {
//       Object.entries(options.headers).forEach(([key, value]) => {
//         if (key.toLowerCase() !== "content-length") {
//           // Skip 'content-length'
//           request.setHeader(key, value as string);
//         }
//       });
//     }

//     // Handle request body
//     if (options.body) {
//       let bodyData;
//       if (options.body instanceof ArrayBuffer) {
//         bodyData = Buffer.from(options.body);
//       } else if (
//         typeof options.body === "string" ||
//         Buffer.isBuffer(options.body)
//       ) {
//         bodyData = options.body;
//       } else if (typeof options.body === "object") {
//         bodyData = JSON.stringify(options.body);
//         request.setHeader("Content-Type", "application/json");
//       } else {
//         reject(new Error("Unsupported body type"));
//         return;
//       }
//       request.write(bodyData);
//     }

//     request.on("response", (response) => {
//       const chunks: Buffer[] = [];
//       response.on("data", (chunk) => chunks.push(chunk as Buffer));
//       response.on("end", () => {
//         const buffer = Buffer.concat(chunks);
//         resolve(
//           new Response(buffer, {
//             status: response.statusCode,
//             statusText: response.statusMessage,
//             headers: new Headers(response.headers as any),
//           })
//         );
//       });
//     });

//     request.on("error", (error) => {
//       console.error("Request error:", error); // Improved error logging
//       reject(error);
//     });

//     request.end();
//   });
// };

// import { net, ClientRequestConstructorOptions } from 'electron';
import { Readable } from "stream";

export const customFetchUsingElectronNetStreaming = async (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> => {
  const url = input instanceof URL ? input.href : input.toString();
  const options = init || {};

  return new Promise((resolve, reject) => {
    const requestOptions: ClientRequestConstructorOptions = {
      method: options.method || "GET",
      url: url,
    };

    // Ignore the 'agent' property from 'init' as it's not relevant for Electron's net module
    if ("agent" in options) {
      delete options.agent;
    }

    const request = net.request(requestOptions);

    // Set headers, except for 'content-length' which will be set automatically
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== "content-length") {
          // Skip 'content-length'
          request.setHeader(key, value as string);
        }
      });
    }

    // Handle request body
    if (options.body) {
      let bodyData;
      if (options.body instanceof ArrayBuffer) {
        bodyData = Buffer.from(options.body);
      } else if (
        typeof options.body === "string" ||
        Buffer.isBuffer(options.body)
      ) {
        bodyData = options.body;
      } else if (typeof options.body === "object") {
        bodyData = JSON.stringify(options.body);
        request.setHeader("Content-Type", "application/json");
      } else {
        reject(new Error("Unsupported body type"));
        return;
      }
      request.write(bodyData);
    }

    request.on("response", (response) => {
      const nodeStream = new Readable({
        read() {},
      });

      response.on("data", (chunk) => {
        nodeStream.push(chunk);
      });

      response.on("end", () => {
        nodeStream.push(null); // Signal end of stream
      });

      response.on("error", (error: any) => {
        nodeStream.destroy(error); // Handle stream errors
      });

      const webStream = nodeToWebStream(nodeStream);

      resolve(
        new Response(webStream, {
          status: response.statusCode,
          statusText: response.statusMessage,
          headers: new Headers(response.headers as any),
        })
      );
    });

    request.on("error", (error) => {
      reject(error);
    });

    request.end();
  });
};

function nodeToWebStream(nodeStream: Readable): ReadableStream<Uint8Array> {
  let isStreamEnded = false;

  const webStream = new ReadableStream<Uint8Array>({
    start(controller) {
      nodeStream.on("data", (chunk) => {
        if (!isStreamEnded) {
          controller.enqueue(
            chunk instanceof Buffer ? new Uint8Array(chunk) : chunk
          );
        }
      });

      nodeStream.on("end", () => {
        if (!isStreamEnded) {
          isStreamEnded = true;
          controller.close();
        }
      });

      nodeStream.on("error", (err) => {
        if (!isStreamEnded) {
          isStreamEnded = true;
          controller.error(err);
        }
      });
    },
    cancel(reason) {
      // Handle any cleanup or abort logic here
      nodeStream.destroy(reason);
    },
  });

  return webStream;
}
// function nodeToWebStream(nodeStream: Readable): ReadableStream<Uint8Array> {
//   const webStream = new ReadableStream<Uint8Array>({
//     start(controller) {
//       nodeStream.on("data", (chunk) => {
//         controller.enqueue(
//           chunk instanceof Buffer ? new Uint8Array(chunk) : chunk
//         );
//       });
//       nodeStream.on("end", () => {
//         controller.close();
//       });
//       nodeStream.on("error", (err) => {
//         controller.error(err);
//       });
//     },
//   });
//   return webStream;
// }
