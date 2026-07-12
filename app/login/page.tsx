import React from 'react'
import AuthForm from '../../components/platform/AuthForm'
import AuthShell from '../../components/platform/AuthShell'

export default function LoginPage() {
  return (
    <AuthShell mode="login">
      <AuthForm mode="login" />
    </AuthShell>
  )
}
