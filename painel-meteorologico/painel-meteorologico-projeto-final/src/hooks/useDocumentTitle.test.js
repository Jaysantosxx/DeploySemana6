import { renderHook } from '@testing-library/react';
import useDocumentTitle from './useDocumentTitle.js';

describe('useDocumentTitle', () => {
  it('define o título da aba com o nome do app', () => {
    renderHook(() => useDocumentTitle('Início'));
    expect(document.title).toBe('Início · Painel Meteorológico');
  });

  it('acompanha mudanças e volta ao nome do app sem título', () => {
    const { rerender } = renderHook(({ t }) => useDocumentTitle(t), { initialProps: { t: 'Sobre' } });
    expect(document.title).toBe('Sobre · Painel Meteorológico');

    rerender({ t: undefined });
    expect(document.title).toBe('Painel Meteorológico');
  });
});