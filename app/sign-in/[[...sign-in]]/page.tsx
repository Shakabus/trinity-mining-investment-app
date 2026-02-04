import { SignIn } from '@clerk/nextjs'
import '../../clerk-custom.css'

export default function SignInPage() {
  return (
    <div 
      className="flex min-h-screen items-center justify-center"
      style={{ background: '#000000' }}
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
