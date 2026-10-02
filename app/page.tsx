import { Navbar } from '@/components/landing/navbar'
import { Hero } from '@/components/landing/hero'
import { LogosStrip } from '@/components/landing/logos-strip'
import { Features } from '@/components/landing/features'
import { HowItWorks } from '@/components/landing/how-it-works'
import { Testimonials } from '@/components/landing/testimonials'
import { Pricing } from '@/components/landing/pricing'
import { Footer } from '@/components/landing/footer'

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <LogosStrip />
        <Features />
        <HowItWorks />
        <Testimonials />
        <Pricing />
      </main>
      <Footer />
    </>
  )
}
