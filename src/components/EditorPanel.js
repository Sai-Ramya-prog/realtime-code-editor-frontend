import React from 'react';
import Editor from '@monaco-editor/react';

const EditorPanel = ({ language, value, onChange, onMount }) => {
  return (
    <Editor
      height="80vh"
      theme="vs-dark"
      language={language}
      value={value}
      onChange={onChange}
      onMount={onMount} // expose editor instance to parent
    />
  );
};

export default EditorPanel;
