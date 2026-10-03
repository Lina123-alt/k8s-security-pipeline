import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'

describe('App', () => {
  it('affiche le formulaire de connexion par défaut', () => {
    render(<App />)
    expect(screen.getByText('Bon retour')).toBeInTheDocument()
  })

  it('affiche les champs email et mot de passe', () => {
    render(<App />)
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Mot de passe')).toBeInTheDocument()
  })
})
