import { SignIn } from '@clerk/nextjs'
import '../../clerk-custom.css'

export default function SignInPage() {
  return (
    <div 
      className="flex min-h-screen items-center justify-center"
      style={{
        background: `
          radial-gradient(
            1200px circle at 80% 20%,
            rgba(88, 45, 255, 0.15),
            transparent 60%
          ),
          linear-gradient(
            160deg,
            #050812 0%,
            #0b1230 18%,
            #131b45 36%,
            #24105f 55%,
            #3a137a 72%,
            #5b1fa6 100%
          )`
      }}
    >
      <SignIn 
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-2xl"
          }
        }}
      />
    </div>
  )
}