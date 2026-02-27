import { View, Text, StyleSheet } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, fonts } from '@/constants/theme';

interface StatCardProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  sublabel: string;
}

function StatCard({ icon, value, label, sublabel }: StatCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        {icon}
        <Text style={styles.value}>{value}</Text>
      </View>
      <View>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.sublabel}>{sublabel}</Text>
      </View>
    </View>
  );
}

export default function StatsGrid() {
  return (
    <View style={styles.grid}>
      <StatCard
        icon={
          <View style={[styles.iconCircle, styles.boltIcon]}>
            <Feather name="zap" size={20} color={colors.accentPrimary} />
          </View>
        }
        value="98%"
        label="Energy"
        sublabel="READY TO BATTLE"
      />
      <StatCard
        icon={
          <View style={[styles.iconCircle, styles.fireIcon]}>
            <Ionicons name="flame" size={20} color={colors.accentSecondary} />
          </View>
        }
        value="12"
        label="Streak"
        sublabel="DAILY WINS"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  card: {
    flex: 1,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    padding: 16,
    gap: 12,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boltIcon: {
    backgroundColor: 'rgba(204, 255, 0, 0.1)',
  },
  fireIcon: {
    backgroundColor: 'rgba(255, 77, 0, 0.1)',
  },
  value: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  sublabel: {
    fontSize: 11,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.textSecondary,
  },
});
