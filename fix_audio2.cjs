const fs = require('fs');
let t = fs.readFileSync('src/App.tsx', 'utf-8');

const stopCode = `
  const stopListening = () => {
    if (recognitionRef.current) {
        recognitionRef.current.stop();
        setIsRecording(false);
    }
  };

  const stopListeningQuestion = () => {
    if (recognitionRef.current) {
        recognitionRef.current.stop();
        setIsRecording(false);
    }
  };
`;

const insertIdx = t.indexOf('const startListening = () => {');
t = t.substring(0, insertIdx) + stopCode + '\n  ' + t.substring(insertIdx);
fs.writeFileSync('src/App.tsx', t);
