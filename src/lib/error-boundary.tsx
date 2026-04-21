import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

type State = { error: Error | null };

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] caught', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <ScrollView style={styles.root} contentContainerStyle={styles.content}>
          <Text style={styles.title}>App crashed</Text>
          <Text style={styles.msg}>{this.state.error.message}</Text>
          {this.state.error.stack ? (
            <Text style={styles.stack}>{this.state.error.stack}</Text>
          ) : null}
        </ScrollView>
      );
    }
    return <>{this.props.children}</>;
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0E0B0A' },
  content: { padding: 24, paddingTop: 80 },
  title: { color: '#E07A68', fontSize: 20, fontWeight: '700', marginBottom: 12 },
  msg: { color: '#F5EEE3', fontSize: 14, marginBottom: 16 },
  stack: { color: '#B3A89A', fontSize: 11, fontFamily: 'Menlo' },
});
