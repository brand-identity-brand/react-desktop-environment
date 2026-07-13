import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from './index.js'

describe('Button', () => {
  it('renders a plain button and forwards its props', () => {
    render(
      <Button type="button" disabled data-purpose="demo">
        Save
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Save' })

    expect(button.tagName).toBe('BUTTON')
    expect(button.type).toBe('button')
    expect(button.disabled).toBe(true)
    expect(button.dataset.purpose).toBe('demo')
  })
})
