import { SignUp } from '@clerk/nextjs'
import '../../clerk-custom.css'

export default function SignUpPage() {
  return (
    <div 
      className="flex min-h-screen items-center justify-center"
      style={{ background: '#000000' }}
    >
      <SignUp 
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
