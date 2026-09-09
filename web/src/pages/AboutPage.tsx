import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { EditableText } from '@/components/site/EditableText';
import { ScrollImageStory } from '@/components/site/ScrollImageStory';

const headingStyle = { fontFamily: 'var(--site-font-heading)' };

// "Quiénes somos" — the church's history and vision, told as a
// scroll-linked image story (ScrollImageStory) with one admin-editable
// photo per slide. Each slide's text is one or more EditableText fields
// (plain text only, no inline bold/italic) — content and wording are
// admin-managed via edit mode at this point, so the fallback strings
// here just mirror whatever's currently live rather than the original
// ported copy; update them here too if asked to keep the code in sync
// after a live edit.
export function AboutPage() {
  return (
    <div
      className='flex min-h-screen flex-col bg-(--site-bg)'
      style={{ fontFamily: 'var(--site-font-body)' }}
    >
      <SiteHeader />

      <section className='px-4 pt-12 pb-8 text-center sm:px-6'>
        <EditableText
          slotKey='about-h1'
          as='h1'
          className='text-3xl font-bold text-(--site-maroon) uppercase'
          style={headingStyle}
          fallback='Quiénes somos'
        />
      </section>

      <ScrollImageStory
        sections={[
          {
            photoSlotKey: 'about-story-photo-0',
            text: (
              <>
                <EditableText
                  slotKey='about-story-0-a'
                  as='p'
                  multiline
                  fallback='[Quiénes somos — parte 1]'
                />
                <EditableText
                  slotKey='about-story-0-b'
                  as='p'
                  multiline
                  className='mt-4'
                  fallback='[Quiénes somos — parte 2]'
                />
              </>
            ),
          },
          {
            photoSlotKey: 'about-story-photo-1',
            text: (
              <EditableText
                slotKey='about-story-1-a'
                as='p'
                multiline
                fallback='[Quiénes somos — parte 3]'
              />
            ),
          },
          {
            photoSlotKey: 'about-story-photo-2',
            text: (
              <>
                <EditableText
                  slotKey='about-story-2-a'
                  as='p'
                  multiline
                  className='font-semibold'
                  fallback='[Versículo]'
                />
                <EditableText
                  slotKey='about-story-2-b'
                  as='p'
                  multiline
                  className='mt-2'
                  fallback='[Texto del versículo]'
                />
              </>
            ),
          },
          {
            photoSlotKey: 'about-story-photo-3',
            text: (
              <>
                <EditableText
                  slotKey='about-story-3-label'
                  as='p'
                  className='font-semibold'
                  fallback='[Encabezado — visión]'
                />
                <EditableText
                  slotKey='about-story-3-a'
                  as='p'
                  multiline
                  className='mt-2'
                  fallback='[Nuestra visión — parte 1]'
                />
              </>
            ),
          },
          {
            photoSlotKey: 'about-story-photo-4',
            text: (
              <>
                <EditableText
                  slotKey='about-story-4-a'
                  as='p'
                  multiline
                  className='mt-4'
                  fallback='[Nuestra visión — parte 2]'
                />
              </>
            ),
          },
          {
            photoSlotKey: 'about-story-photo-5',
            text: (
              <>
                <EditableText
                  slotKey='about-story-5-a'
                  as='p'
                  multiline
                  fallback='[Declaración — parte 1]'
                />
                <EditableText
                  slotKey='about-story-5-b'
                  as='p'
                  multiline
                  fallback='[Declaración — parte 2]'
                />
                <EditableText
                  slotKey='about-story-5-c'
                  as='p'
                  multiline
                  fallback='[Declaración — parte 3]'
                />
              </>
            ),
          },
        ]}
      />

      <SiteFooter />
    </div>
  );
}
