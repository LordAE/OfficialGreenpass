import { base44 } from './base44Client';




export const Core = base44.integrations.Core;

export const InvokeLLM = base44.integrations.Core.InvokeLLM;

export const SendEmail = base44.integrations.Core.SendEmail;

export const UploadFile = base44.integrations.Core.UploadFile;

export const GenerateImage = base44.integrations.Core.GenerateImage;

export const ExtractDataFromUploadedFile = base44.integrations.Core.ExtractDataFromUploadedFile;

export const CreateFileSignedUrl = base44.integrations.Core.CreateFileSignedUrl;

export const UploadPrivateFile = base44.integrations.Core.UploadPrivateFile;





// src/api/integrations.js

/**
 * These functions stub out the Base44 integrations.  Replace the bodies with
 * real implementations or calls to your preferred services.
 */

// Simulate a language‑model invocation (returns a canned reply).
export async function InvokeLLM({ messages, model }) {
  console.warn('InvokeLLM called – no LLM is configured.');
  return {
    id: 'stub-llm-response',
    choices: [
      {
        message: {
          role: 'assistant',
          content: 'AI is currently disabled.',
        },
      },
    ],
  };
}

// Simulate sending an email.  Return a dummy message ID.
export async function SendEmail({ to, subject, text, html }) {
  console.warn('SendEmail called – email service is not configured.');
  return { messageId: 'stub-email-123' };
}

// Simulate file upload.  Return a fake URL.
export async function UploadFile({ file, path }) {
  console.warn('UploadFile called – no storage provider configured.');
  return { url: 'https://example.com/stub-file' };
}

export async function GenerateImage(/* args */) {
  console.warn('GenerateImage called – image generation disabled.');
  return { url: 'https://example.com/stub-image' };
}

export async function ExtractDataFromUploadedFile(/* args */) {
  console.warn('ExtractDataFromUploadedFile called – extraction disabled.');
  return { data: null };
}

export async function CreateFileSignedUrl(/* args */) {
  console.warn('CreateFileSignedUrl called – no signing service configured.');
  return { url: 'https://example.com/stub-signed-url' };
}

export async function UploadPrivateFile(/* args */) {
  console.warn('UploadPrivateFile called – no private storage configured.');
  return { url: 'https://example.com/stub-private-file' };
}

