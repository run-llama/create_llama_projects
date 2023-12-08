This is a [LlamaIndex](https://www.llamaindex.ai/) project using [Next.js](https://nextjs.org/) bootstrapped with [`create-llama`](https://github.com/run-llama/LlamaIndexTS/tree/main/packages/create-llama).

## Introduction

This example allows you to have a chat using the [GPT4 Vision model](https://platform.openai.com/docs/guides/vision) from OpenAI. You can upload files and ask the model to describe them.

To keep the example simple, we are not using a database or any other kind of storage for the images.
Instead, they are sent to the model in base64 encoding. This is not very efficient and only works for small images
like the ones in the `./data` folder.

We recommended implementing a server upload and sending just the URL of the image instead.
A straightforward way is to use [Vercel Blob](https://vercel.com/docs/storage/vercel-blob/quickstart#server-uploads) which is a file storage service that is easy to integrate with Next.js.

## Getting Started

First, install the dependencies:

```
npm install
```

Second, run the development server:

```
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about LlamaIndex, take a look at the following resources:

- [LlamaIndex Documentation](https://docs.llamaindex.ai) - learn about LlamaIndex (Python features).
- [LlamaIndexTS Documentation](https://ts.llamaindex.ai) - learn about LlamaIndex (Typescript features).

You can check out [the LlamaIndexTS GitHub repository](https://github.com/run-llama/LlamaIndexTS) - your feedback and contributions are welcome!
