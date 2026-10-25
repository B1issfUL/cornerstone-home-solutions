export default function RevealWords({ children }) {
  return String(children).split(/(\s+)/).map((word, index) => (
    /\s/.test(word)
      ? word
      : <span className="word-mask" key={index}><span className="reveal-word">{word}</span></span>
  ));
}
