const wrap = (content: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">${content}</svg>`;

const petals = Array.from({ length: 8 }, (_, index) => `<ellipse cx="256" cy="161" rx="56" ry="105" fill="${index % 2 ? '#ff7148' : '#ff8b53'}" transform="rotate(${index * 45} 256 256)"/>`).join('');
export const samples = [
  { id: 'bloom', name: 'Sun bloom', kind: 'Smooth curves', svg: wrap(`<g>${petals}</g><circle cx="256" cy="256" r="73" fill="#5429d4"/><circle cx="233" cy="246" r="7" fill="#fff4c9"/><circle cx="279" cy="246" r="7" fill="#fff4c9"/><path d="M230 276 Q256 302 282 276" fill="none" stroke="#fff4c9" stroke-width="8" stroke-linecap="round"/>`) },
  { id: 'camera', name: 'Camera', kind: 'Icon + holes', svg: wrap('<path d="M94 152H168L198 104H314L344 152H418Q446 152 446 180V380Q446 408 418 408H94Q66 408 66 380V180Q66 152 94 152Z" fill="#5429d4"/><circle cx="256" cy="272" r="91" fill="#f8f6ff"/><circle cx="256" cy="272" r="63" fill="#ff8b53"/><circle cx="385" cy="204" r="15" fill="#f8f6ff"/>') },
  { id: 'pop', name: 'Electric pop', kind: 'Layered color', svg: wrap('<rect width="512" height="512" fill="#f9d94c"/><circle cx="125" cy="127" r="105" fill="#f86685"/><path d="M0 405L512 125V512H0Z" fill="#69d0dc"/><path d="M285 35L129 292H236L204 474L389 210H278Z" fill="#272137"/><path d="M269 46L111 284H219L187 449L368 203H258Z" fill="#fff9e9"/><circle cx="423" cy="399" r="40" fill="#633be3"/>') },
  { id: 'pixel', name: 'Pixel heart', kind: 'Sharp corners', svg: wrap('<path d="M96 128H160V96H224V128H288V96H352V128H416V256H384V288H352V320H320V352H288V384H224V352H192V320H160V288H128V256H96Z" fill="#f05a7a"/><path d="M128 160H160V128H192V160H160V224H128Z" fill="#ffc6d7"/>') },
  { id: 'noise', name: 'Speckle test', kind: 'Noise cleanup', svg: wrap('<rect width="512" height="512" fill="#fff"/><circle cx="256" cy="256" r="156" fill="#5429d4"/><circle cx="256" cy="256" r="94" fill="#fff"/>' + Array.from({ length: 70 }, (_, index) => `<circle cx="${16 + (index * 79) % 480}" cy="${16 + (index * 113) % 480}" r="${1 + index % 3}" fill="#5429d4"/>`).join('')) },
];

export function sampleUrl(svg: string) { return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`; }

export async function sampleFile(id: string): Promise<File> {
  const sample = samples.find((item) => item.id === id)!;
  const response = await fetch(`/samples/${sample.id}.png`);
  if (!response.ok) throw new Error('Sample PNG could not be loaded.');
  const blob = await response.blob();
  return new File([blob], `${sample.id}.png`, { type: 'image/png' });
}
