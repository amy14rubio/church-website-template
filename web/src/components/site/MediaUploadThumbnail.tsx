import type { useMediaUpload } from '@/hooks/useMediaUpload';
import { PlusIcon, TrashIcon } from '@/components/ui/icons';

// A click-to-upload square imitating a reference `useImageUpload` hook's
// interaction: an empty dashed box opens the file picker on click, and
// once a file is chosen it's replaced by a live local preview
// (createObjectURL — no network round-trip needed just to see what got
// picked) with its own remove button, rather than a bare OS file input
// that gives no feedback about what's actually selected. A <video> shows
// its first frame as a real thumbnail with zero extra work, so video
// uploads get a preview too, not just images.
//
// `boxClassName` supplies the border/muted-text/hover-bg classes, since
// this is shared between the public-site theme (--site-* tokens, see
// PhotoPickerModal) and the admin theme (--border/--text-muted/--surface-
// hover, see SiteMediaPage) — the two don't share CSS variable names.
export function MediaUploadThumbnail({
  upload,
  accept = 'image/*,video/*',
  boxClassName,
}: {
  upload: ReturnType<typeof useMediaUpload>;
  accept?: string;
  boxClassName: string;
}) {
  const {
    file,
    previewUrl,
    kind,
    fileInputRef,
    handleThumbnailClick,
    handleFileChange,
    handleRemove,
  } = upload;

  return (
    <div className='relative aspect-video w-full'>
      <input
        ref={fileInputRef}
        type='file'
        accept={accept}
        onChange={handleFileChange}
        className='hidden'
      />
      {previewUrl ? (
        <div className={`relative h-full w-full overflow-hidden rounded-lg border ${boxClassName}`}>
          {kind === 'video' ? (
            <video src={previewUrl} className='h-full w-full object-cover' muted playsInline />
          ) : (
            <img src={previewUrl} alt={file?.name ?? ''} className='h-full w-full object-cover' />
          )}
          <button
            type='button'
            onClick={handleRemove}
            aria-label='Quitar archivo'
            title='Quitar archivo'
            className='absolute top-1 right-1 cursor-pointer rounded bg-black/70 p-1 text-white hover:bg-black/85'
          >
            <TrashIcon />
          </button>
        </div>
      ) : (
        <button
          type='button'
          onClick={handleThumbnailClick}
          className={`flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed p-2 text-center text-xs ${boxClassName}`}
        >
          <PlusIcon />
          Subir imagen o video
        </button>
      )}
    </div>
  );
}
