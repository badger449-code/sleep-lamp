import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VoiceSelector } from './VoiceSelector';
import { useVoiceStore } from '../../store/useVoiceStore';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style }) => <div className={className} style={style}>{children}</div>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

describe('VoiceSelector Component', () => {
  beforeEach(() => {
    // Reset store before each test
    useVoiceStore.setState({
      voiceId: 'Cherry',
      voices: [
        { id: 'Cherry', name: '芊悦', description: '阳光积极', gender: '女性', languages: '中文（普通话）、英语' },
        { id: 'Ethan', name: '晨煦', description: '标准普通话', gender: '男性', languages: '中文（普通话）' },
        { id: 'Rocky', name: '粤语-阿强', description: '幽默风趣', gender: '男性', languages: '中文（粤语）、英语' },
        { id: 'Jada', name: '上海-阿珍', description: '沪上阿姐', gender: '女性', languages: '中文（上海话）' }
      ]
    });
  });

  it('renders default selected voice', () => {
    render(<VoiceSelector />);
    expect(screen.getByText('芊悦')).toBeInTheDocument();
  });

  it('opens dropdown when clicked', async () => {
    render(<VoiceSelector />);
    const button = screen.getByRole('button', { name: /芊悦/i });
    await userEvent.click(button);
    
    // Check if dropdown items are rendered
    expect(screen.getByPlaceholderText('搜索音色...')).toBeInTheDocument();
    expect(screen.getByText('晨煦')).toBeInTheDocument();
  });

  it('filters by search query', async () => {
    render(<VoiceSelector />);
    await userEvent.click(screen.getByRole('button', { name: /芊悦/i }));
    
    const searchInput = screen.getByPlaceholderText('搜索音色...');
    await userEvent.type(searchInput, '阿强');
    
    expect(screen.getByText('粤语-阿强')).toBeInTheDocument();
    expect(screen.queryByText('晨煦')).not.toBeInTheDocument();
  });

  it('filters by language (粤语)', async () => {
    render(<VoiceSelector />);
    await userEvent.click(screen.getByRole('button', { name: /芊悦/i }));
    
    const yueyuButton = screen.getByRole('button', { name: '粤语' });
    await userEvent.click(yueyuButton);
    
    expect(screen.getByText('粤语-阿强')).toBeInTheDocument();
    // '芊悦' might still be in the trigger button, so we check if there's only 1 instance
    expect(screen.getAllByText('芊悦')).toHaveLength(1);
  });

  it('filters by language (方言)', async () => {
    render(<VoiceSelector />);
    await userEvent.click(screen.getByRole('button', { name: /芊悦/i }));
    
    const fangyanButton = screen.getByRole('button', { name: '方言' });
    await userEvent.click(fangyanButton);
    
    expect(screen.getByText('上海-阿珍')).toBeInTheDocument();
    // 粤语 is treated separately in our logic
    expect(screen.queryByText('粤语-阿强')).not.toBeInTheDocument();
  });

  it('filters by gender (男性)', async () => {
    render(<VoiceSelector />);
    await userEvent.click(screen.getByRole('button', { name: /芊悦/i }));
    
    const maleButton = screen.getByRole('button', { name: '男' });
    await userEvent.click(maleButton);
    
    expect(screen.getByText('晨煦')).toBeInTheDocument();
    expect(screen.getByText('粤语-阿强')).toBeInTheDocument();
    expect(screen.getAllByText('芊悦')).toHaveLength(1);
  });

  it('selects a voice and updates store', async () => {
    render(<VoiceSelector />);
    await userEvent.click(screen.getByRole('button', { name: /芊悦/i }));
    
    const ethanButton = screen.getByRole('button', { name: /晨煦/i });
    await userEvent.click(ethanButton);
    
    // Dropdown should close and trigger button text should update
    expect(useVoiceStore.getState().voiceId).toBe('Ethan');
    // Re-render happens
    expect(screen.getByRole('button', { name: /晨煦/i })).toBeInTheDocument();
  });

  it('shows empty state when no matches', async () => {
    render(<VoiceSelector />);
    await userEvent.click(screen.getByRole('button', { name: /芊悦/i }));
    
    const searchInput = screen.getByPlaceholderText('搜索音色...');
    await userEvent.type(searchInput, 'nonexistentvoice');
    
    expect(screen.getByText('没有找到匹配的音色')).toBeInTheDocument();
  });
});
