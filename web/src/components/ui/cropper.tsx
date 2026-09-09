import { Cropper as CropperPrimitive } from '@origin-space/image-cropper'

// Minimal class-join helper — this file only ever combines the one
// hardcoded base string below with an optional caller-supplied
// className, never two Tailwind classes that could conflict on the same
// property, so a full clsx+tailwind-merge dependency isn't needed here.
function cn(...classes: Array<string | undefined | false>): string {
  return classes.filter(Boolean).join(' ')
}

function Cropper({ className, ...props }: React.ComponentProps<typeof CropperPrimitive.Root>) {
  return (
    <CropperPrimitive.Root
      data-slot="cropper"
      className={cn(
        'relative flex w-full cursor-move touch-none items-center justify-center overflow-hidden focus:outline-none',
        className,
      )}
      {...props}
    />
  )
}

function CropperDescription({ className, ...props }: React.ComponentProps<typeof CropperPrimitive.Description>) {
  return <CropperPrimitive.Description data-slot="cropper-description" className={cn('sr-only', className)} {...props} />
}

function CropperImage({ className, ...props }: React.ComponentProps<typeof CropperPrimitive.Image>) {
  return (
    <CropperPrimitive.Image
      data-slot="cropper-image"
      className={cn('pointer-events-none h-full w-full object-cover', className)}
      {...props}
    />
  )
}

function CropperCropArea({ className, ...props }: React.ComponentProps<typeof CropperPrimitive.CropArea>) {
  return (
    <CropperPrimitive.CropArea
      data-slot="cropper-crop-area"
      className={cn(
        // Darkened enough that the excluded area outside the white frame
        // reads as "not part of the crop" rather than as extra photo
        // still in play — at the previous, lighter 0.3 opacity it was
        // easy to misjudge the final crop as including that dimmed
        // surrounding context instead of just what's inside the frame.
        'pointer-events-none absolute border-3 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] in-[[data-slot=cropper]:focus-visible]:ring-[3px] in-[[data-slot=cropper]:focus-visible]:ring-white/50',
        className,
      )}
      {...props}
    />
  )
}

export { Cropper, CropperDescription, CropperImage, CropperCropArea }
