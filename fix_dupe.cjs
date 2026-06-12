const fs = require('fs');
let t = fs.readFileSync('src/App.tsx', 'utf-8');

t = t.replace(`  const stopListening = () => {
    if (recognitionRef.current) {
        recognitionRef.current.stop();
        setIsRecording(false);
    }
  };


  const stopListening = () => {
    if (recognitionRef.current) {
        recognitionRef.current.stop();
        setIsRecording(false);
    }
  };`, `  const stopListening = () => {
    if (recognitionRef.current) {
        recognitionRef.current.stop();
        setIsRecording(false);
    }
  };`);

t = t.replace(`  const stopListeningQuestion = () => {
    if (recognitionRef.current) {
        recognitionRef.current.stop();
        setIsRecording(false);
    }
  };`, ``); // We will leave one occurrence further down if it exists, or just use regex to remove multiple? Let's check occurrences carefully.

fs.writeFileSync('src/App.tsx', t);
