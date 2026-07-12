import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import InputScreen from '../InputScreen';

const baseProps = {
  repoUrl: '',
  tone: 'documentary' as const,
  error: '',
  cooldown: false,
  onRepoUrlChange: vi.fn(),
  onToneChange: vi.fn(),
  onGenerate: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('InputScreen tone radio group', () => {
  it('renders all three tone options as radios', () => {
    render(<InputScreen {...baseProps} />);
    expect(screen.getByRole('radio', { name: /epic/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /documentary/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /casual/i })).toBeInTheDocument();
  });

  it('marks only the active tone as aria-checked', () => {
    render(<InputScreen {...baseProps} tone="epic" />);
    expect(screen.getByRole('radio', { name: /epic/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /documentary/i })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('radio', { name: /casual/i })).toHaveAttribute('aria-checked', 'false');
  });

  it('gives tabIndex 0 only to the selected tone', () => {
    render(<InputScreen {...baseProps} tone="casual" />);
    expect(screen.getByRole('radio', { name: /casual/i })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('radio', { name: /epic/i })).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('radio', { name: /documentary/i })).toHaveAttribute('tabindex', '-1');
  });

  it('ArrowRight advances to the next tone', () => {
    const onToneChange = vi.fn();
    render(<InputScreen {...baseProps} tone="epic" onToneChange={onToneChange} />);
    fireEvent.keyDown(screen.getByRole('radio', { name: /epic/i }), { key: 'ArrowRight' });
    expect(onToneChange).toHaveBeenCalledWith('documentary');
  });

  it('ArrowDown advances to the next tone', () => {
    const onToneChange = vi.fn();
    render(<InputScreen {...baseProps} tone="epic" onToneChange={onToneChange} />);
    fireEvent.keyDown(screen.getByRole('radio', { name: /epic/i }), { key: 'ArrowDown' });
    expect(onToneChange).toHaveBeenCalledWith('documentary');
  });

  it('ArrowLeft goes to the previous tone', () => {
    const onToneChange = vi.fn();
    render(<InputScreen {...baseProps} tone="documentary" onToneChange={onToneChange} />);
    fireEvent.keyDown(screen.getByRole('radio', { name: /documentary/i }), { key: 'ArrowLeft' });
    expect(onToneChange).toHaveBeenCalledWith('epic');
  });

  it('ArrowRight wraps from last to first', () => {
    const onToneChange = vi.fn();
    render(<InputScreen {...baseProps} tone="casual" onToneChange={onToneChange} />);
    fireEvent.keyDown(screen.getByRole('radio', { name: /casual/i }), { key: 'ArrowRight' });
    expect(onToneChange).toHaveBeenCalledWith('epic');
  });

  it('ArrowLeft wraps from first to last', () => {
    const onToneChange = vi.fn();
    render(<InputScreen {...baseProps} tone="epic" onToneChange={onToneChange} />);
    fireEvent.keyDown(screen.getByRole('radio', { name: /epic/i }), { key: 'ArrowLeft' });
    expect(onToneChange).toHaveBeenCalledWith('casual');
  });

  it('unrelated keys do not call onToneChange', () => {
    const onToneChange = vi.fn();
    render(<InputScreen {...baseProps} tone="epic" onToneChange={onToneChange} />);
    fireEvent.keyDown(screen.getByRole('radio', { name: /epic/i }), { key: 'Enter' });
    expect(onToneChange).not.toHaveBeenCalled();
  });
});

describe('InputScreen URL input', () => {
  it('renders the URL input with the correct label', () => {
    render(<InputScreen {...baseProps} />);
    expect(screen.getByLabelText(/github repository url/i)).toBeInTheDocument();
  });

  it('shows error message and sets aria-invalid when error is present', () => {
    render(<InputScreen {...baseProps} error="Please enter a valid GitHub URL" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Please enter a valid GitHub URL');
    expect(screen.getByLabelText(/github repository url/i)).toHaveAttribute('aria-invalid', 'true');
  });

  it('does not show error element when error is empty', () => {
    render(<InputScreen {...baseProps} error="" />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('InputScreen generate button', () => {
  it('is disabled and shows "Please wait" during cooldown', () => {
    render(<InputScreen {...baseProps} cooldown={true} />);
    const btn = screen.getByRole('button', { name: /please wait/i });
    expect(btn).toBeDisabled();
  });

  it('is enabled and shows "Generate" when not in cooldown', () => {
    render(<InputScreen {...baseProps} cooldown={false} />);
    expect(screen.getByRole('button', { name: /generate film/i })).not.toBeDisabled();
  });
});
