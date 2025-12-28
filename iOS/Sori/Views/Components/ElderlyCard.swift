import SwiftUI

struct ElderlyCard: View {
    let elderly: Elderly

    var body: some View {
        HStack(spacing: 12) {
            // 프로필 아이콘
            Image(systemName: "person.circle.fill")
                .resizable()
                .frame(width: 50, height: 50)
                .foregroundColor(.blue)

            // 정보
            VStack(alignment: .leading, spacing: 4) {
                Text(elderly.name)
                    .font(.headline)
                    .foregroundColor(.primary)

                if let age = elderly.age {
                    Text("\(age)세")
                        .font(.subheadline)
                        .foregroundColor(.gray)
                }

                if let phone = elderly.phone {
                    Text(phone)
                        .font(.caption)
                        .foregroundColor(.gray)
                }
            }

            Spacer()

            // 위험도 배지
            VStack(alignment: .trailing, spacing: 4) {
                RiskLevelBadge(level: elderly.risk_level)

                if elderly.call_schedule.enabled {
                    Image(systemName: "clock.fill")
                        .font(.caption)
                        .foregroundColor(.blue)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
}

struct RiskLevelBadge: View {
    let level: String

    private var color: Color {
        switch level.lowercased() {
        case "high": return .red
        case "medium": return .orange
        case "low": return .green
        default: return .gray
        }
    }

    private var text: String {
        switch level.lowercased() {
        case "high": return "고"
        case "medium": return "중"
        case "low": return "저"
        default: return "-"
        }
    }

    var body: some View {
        Text(text)
            .font(.caption)
            .fontWeight(.bold)
            .foregroundColor(.white)
            .frame(width: 24, height: 24)
            .background(color)
            .cornerRadius(12)
    }
}
