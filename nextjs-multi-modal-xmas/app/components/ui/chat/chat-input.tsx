import FileUploader from "../file-uploader";
import { ChatHandler } from "./chat.interface";

export default function ChatInput(
  props: Pick<
    ChatHandler,
    | "isLoading"
    | "input"
    | "onFileUpload"
    | "onFileError"
    | "handleSubmit"
    | "handleInputChange"
  > & {
    multiModal?: boolean;
  },
) {
  const handleUploadImageFile = async (file: File) => {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
    const event = new Event("submit", { bubbles: true });
    props.handleSubmit(event as unknown as React.FormEvent<HTMLFormElement>, {
      data: { imageUrl: base64 },
    });
  };

  const handleUploadFile = async (file: File) => {
    try {
      if (props.multiModal && file.type.startsWith("image/")) {
        return await handleUploadImageFile(file);
      } else {
        alert("Please select an image file");
      }
    } catch (error: any) {
      props.onFileError?.(error.message);
    }
  };

  return (
    <form className="rounded-xl bg-white p-4 shadow-xl space-y-4">
      <div className="flex w-full items-center justify-between gap-4 ">
        <input type="hidden" name="message" value="dummy" />
        <div className="flex-1 select-none text-right">
          Please upload an image. We'll add the Christmas theme. 🎄
        </div>
        <FileUploader
          onFileUpload={handleUploadFile}
          onFileError={props.onFileError}
        />
      </div>
    </form>
  );
}
