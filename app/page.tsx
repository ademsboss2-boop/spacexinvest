import Nav from '../components/Nav'
import Hero from '../components/Hero'
import CinematicMediaSection from '../components/CinematicMediaSection'
import InvestmentOverview from '../components/InvestmentOverview'
import FeaturedOpportunities from '../components/FeaturedOpportunities'
import WhySpaceXInvest from '../components/WhySpaceXInvest'
import SecurityCompliance from '../components/SecurityCompliance'
import FAQ from '../components/FAQ'
import Footer from '../components/Footer'

export default function Page() {
  return (
    <main id="page-content" className="min-h-screen bg-background">
      <Nav />

      <Hero />

      <CinematicMediaSection
        sectionId="reusability"
        videoSrc="/media/falcon-landing.mp4"
        eyebrow="REUSABILITY"
        title="A NEW MODEL FOR ORBITAL ACCESS"
        description="Flight-proven systems designed to reduce the cost of reaching orbit."
        buttonLabel="EXPLORE OPPORTUNITIES"
        buttonHref="#opportunities"
      />

      <CinematicMediaSection
        sectionId="global-infrastructure"
        videoSrc="/media/earth.mp4"
        eyebrow="GLOBAL INFRASTRUCTURE"
        title="BUILT AT PLANETARY SCALE"
        description="Connecting people, businesses, and communities through orbital technology."
        buttonLabel="VIEW INVESTMENTS"
        buttonHref="#overview"
      />

      <CinematicMediaSection
        sectionId="human-spaceflight"
        videoSrc="/media/dragon.mp4"
        eyebrow="HUMAN SPACEFLIGHT"
        title="EXPANDING ACCESS BEYOND EARTH"
        description="Supporting technologies that advance transportation, research, and exploration."
        buttonLabel="DISCOVER DRAGON"
        buttonHref="#opportunities"
      />

      <CinematicMediaSection
        sectionId="next-generation"
        imageSrc="/media/astronaut.jpg"
        imageAlt="Astronaut representing the next generation of human space exploration"
        eyebrow="THE NEXT GENERATION"
        title="BUILDING THE FUTURE OF SPACE"
        description="Backing the people and technologies shaping humanity’s next chapter."
        buttonLabel="OUR VISION"
        buttonHref="#overview"
      />

      <CinematicMediaSection
        sectionId="mars"
        videoSrc="/media/mars.mp4"
        eyebrow="MAKING LIFE MULTIPLANETARY"
        title="INVESTING BEYOND EARTH"
        description="Long-term opportunities inspired by a future where humanity reaches farther."
        buttonLabel="EXPLORE MARS"
        buttonHref="#opportunities"
      />

      <InvestmentOverview />
      <FeaturedOpportunities />
      <WhySpaceXInvest />
      <SecurityCompliance />
      <FAQ />
      <Footer />
    </main>
  )
}
