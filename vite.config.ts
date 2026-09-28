import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages ではリポジトリ名のサブパスで公開される
export default defineConfig({
	base: process.env.PAGES_BASE ?? '/',
	plugins: [react()],
});
