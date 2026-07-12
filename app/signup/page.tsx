import React from 'react'
import AuthForm from '../../components/platform/AuthForm'
import AuthShell from '../../components/platform/AuthShell'

export default function SignupPage() {
  return (
    <AuthShell mode="signup">
      <AuthForm mode="signup" />
    </AuthShell>
  )
}
