function OutputConsole({ output }) {
  return (
    <div style={{ border: '1px solid #ccc', height: '300px', marginTop: '10px' }}>
      <iframe
        title="output"
        srcDoc={output}
        sandbox="allow-scripts"
        style={{ width: '100%', height: '100%', border: 'none' }}
      />
    </div>
  );
}

export default OutputConsole;
