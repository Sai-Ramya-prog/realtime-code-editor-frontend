import React from 'react';

function FileTree({ files, onSelect }) {
  return (
    <div style={{ width: '200px', background: '#f0f0f0', padding: '10px' }}>
      <h4>Files</h4>
      <ul>
        {files.map(file => (
          <li key={file.path}>
            <button onClick={() => onSelect(file.path)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
              {file.path}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default FileTree;
