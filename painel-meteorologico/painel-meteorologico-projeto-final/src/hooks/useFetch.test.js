import { renderHook, waitFor } from '@testing-library/react';
import useFetch from './useFetch.js';
import { respostaJson } from '../test/utils.jsx';

describe('useFetch', () => {
  it('não faz requisição quando a URL é nula', () => {
    const { result } = renderHook(() => useFetch(null));

    expect(fetch).not.toHaveBeenCalled();
    expect(result.current).toEqual({ data: null, isLoading: false, error: null });
  });

  it('busca os dados, passa por isLoading e devolve o JSON', async () => {
    fetch.mockResolvedValue(respostaJson({ nome: 'Recife' }));

    const { result } = renderHook(() => useFetch('https://api.exemplo.com/clima'));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual({ nome: 'Recife' });
    expect(result.current.error).toBeNull();
    expect(fetch).toHaveBeenCalledWith(
      'https://api.exemplo.com/clima',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it('repassa as opções (ex.: headers) para o fetch', async () => {
    fetch.mockResolvedValue(respostaJson({}));
    const options = { headers: { Authorization: 'Bearer abc' } };

    renderHook(() => useFetch('https://api.exemplo.com/x', options));

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(fetch.mock.calls[0][1].headers).toEqual({ Authorization: 'Bearer abc' });
  });

  it('expõe erro com o status HTTP quando a resposta não é ok', async () => {
    fetch.mockResolvedValue(respostaJson({}, { status: 404 }));

    const { result } = renderHook(() => useFetch('https://api.exemplo.com/clima'));

    await waitFor(() => expect(result.current.error).not.toBeNull());

    expect(result.current.error.status).toBe(404);
    expect(result.current.error.message).toBe('Erro HTTP 404');
    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('expõe erro quando a rede falha', async () => {
    fetch.mockRejectedValue(new TypeError('Failed to fetch'));

    const { result } = renderHook(() => useFetch('https://api.exemplo.com/clima'));

    await waitFor(() => expect(result.current.error).toBeInstanceOf(TypeError));
    expect(result.current.data).toBeNull();
  });

  it('refaz a busca quando a URL muda', async () => {
    fetch
      .mockResolvedValueOnce(respostaJson({ nome: 'Recife' }))
      .mockResolvedValueOnce(respostaJson({ nome: 'Olinda' }));

    const { result, rerender } = renderHook(({ url }) => useFetch(url), {
      initialProps: { url: 'https://api.exemplo.com/recife' },
    });
    await waitFor(() => expect(result.current.data).toEqual({ nome: 'Recife' }));

    rerender({ url: 'https://api.exemplo.com/olinda' });
    await waitFor(() => expect(result.current.data).toEqual({ nome: 'Olinda' }));

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('cancela a requisição ao desmontar e não trata isso como erro', async () => {
    let sinal;
    fetch.mockImplementation(
      (_url, { signal }) =>
        new Promise((_resolve, reject) => {
          sinal = signal;
          signal.addEventListener('abort', () =>
            reject(Object.assign(new Error('abortado'), { name: 'AbortError' }))
          );
        })
    );

    const { result, unmount } = renderHook(() => useFetch('https://api.exemplo.com/lento'));
    await waitFor(() => expect(fetch).toHaveBeenCalled());

    unmount();

    expect(sinal.aborted).toBe(true);
    expect(result.current.error).toBeNull();
  });
});