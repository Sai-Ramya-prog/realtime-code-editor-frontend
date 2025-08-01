import React from 'react';

function TabBar({ openFiles, activeFile, onSelect }) {
  return (
    <div style={{ background: '#ddd', padding: '5px', display: 'flex' }}>
      {openFiles.map((path) => (
        <div
          key={path}
          onClick={() => onSelect(path)}
          style={{
            marginRight: '10px',
            padding: '5px',
            borderBottom: activeFile === path ? '2px solid blue' : 'none',
            cursor: 'pointer',
          }}
        >
          {path}
        </div>
      ))}
    </div>
  );
}

export default TabBar;
