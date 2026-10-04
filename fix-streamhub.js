const fs = require('fs');
let content = fs.readFileSync('app/stream-hub/page.tsx', 'utf8');

// The exact string in the file right now
content = content.replace("const searchParams = useSearchParams();\r\n  const isViewer = searchParams.get('viewer') === 'true';", "const [isViewer, setIsViewer] = useState(false);\n  useEffect(() => { setIsViewer(window.location.search.includes('viewer=true')); }, []);");
content = content.replace("const searchParams = useSearchParams();\n  const isViewer = searchParams.get('viewer') === 'true';", "const [isViewer, setIsViewer] = useState(false);\n  useEffect(() => { setIsViewer(window.location.search.includes('viewer=true')); }, []);");

fs.writeFileSync('app/stream-hub/page.tsx', content);
