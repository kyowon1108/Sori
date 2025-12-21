import SwiftUI

struct ElderlyDetailView: View {
    let elderlyId: Int

    @StateObject private var elderlyViewModel = ElderlyViewModel()
    @StateObject private var callViewModel = CallViewModel()
    @State private var showCallView = false

    var body: some View {
        ScrollView {
            if elderlyViewModel.isLoading {
                ProgressView()
                    .padding(.top, 50)
            } else if let elderly = elderlyViewModel.currentElderly {
                VStack(spacing: 20) {
                    // 프로필 헤더
                    profileHeader(elderly)

                    // 기본 정보
                    infoSection(elderly)

                    // 통화 시작 버튼
                    callButton

                    // 통화 기록
                    callHistorySection
                }
                .padding()
            } else if let error = elderlyViewModel.errorMessage {
                Text(error)
                    .foregroundColor(.red)
                    .padding()
            }
        }
        .navigationTitle("어르신 상세")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            elderlyViewModel.fetchElderly(elderlyId)
            callViewModel.fetchCalls(elderlyId: elderlyId)
        }
        .fullScreenCover(isPresented: $showCallView) {
            if let elderly = elderlyViewModel.currentElderly {
                CallView(elderly: elderly, isPresented: $showCallView)
            }
        }
    }

    private func profileHeader(_ elderly: Elderly) -> some View {
        VStack(spacing: 12) {
            Image(systemName: "person.circle.fill")
                .resizable()
                .frame(width: 100, height: 100)
                .foregroundColor(.blue)

            Text(elderly.name)
                .font(.title)
                .fontWeight(.bold)

            if let age = elderly.age {
                Text("\(age)세")
                    .font(.subheadline)
                    .foregroundColor(.gray)
            }

            RiskBadge(level: elderly.risk_level)
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(Color.blue.opacity(0.1))
        .cornerRadius(12)
    }

    private func infoSection(_ elderly: Elderly) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("기본 정보")
                .font(.headline)

            VStack(spacing: 12) {
                if let phone = elderly.phone {
                    InfoRow(icon: "phone.fill", title: "전화번호", value: phone)
                }

                if let emergency = elderly.emergency_contact {
                    InfoRow(icon: "exclamationmark.triangle.fill", title: "비상연락처", value: emergency)
                }

                if let health = elderly.health_condition {
                    InfoRow(icon: "heart.fill", title: "건강상태", value: health)
                }

                if let notes = elderly.notes {
                    InfoRow(icon: "note.text", title: "메모", value: notes)
                }

                InfoRow(
                    icon: "clock.fill",
                    title: "상담 시간",
                    value: elderly.call_schedule.times.joined(separator: ", ")
                )
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
        }
    }

    private var callButton: some View {
        Button(action: {
            showCallView = true
        }) {
            HStack {
                Image(systemName: "phone.fill")
                Text("상담 시작")
            }
            .font(.headline)
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            .background(Color.green)
            .cornerRadius(12)
        }
    }

    private var callHistorySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("통화 기록")
                .font(.headline)

            if callViewModel.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity)
            } else if callViewModel.calls.isEmpty {
                Text("통화 기록이 없습니다")
                    .foregroundColor(.gray)
                    .frame(maxWidth: .infinity)
                    .padding()
            } else {
                ForEach(callViewModel.calls) { call in
                    CallHistoryRow(call: call, viewModel: callViewModel)
                }
            }
        }
    }
}

struct InfoRow: View {
    let icon: String
    let title: String
    let value: String

    var body: some View {
        HStack(alignment: .top) {
            Image(systemName: icon)
                .foregroundColor(.blue)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.caption)
                    .foregroundColor(.gray)

                Text(value)
                    .font(.subheadline)
            }

            Spacer()
        }
    }
}

struct RiskBadge: View {
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
        case "high": return "고위험"
        case "medium": return "중위험"
        case "low": return "저위험"
        default: return level
        }
    }

    var body: some View {
        Text(text)
            .font(.caption)
            .fontWeight(.semibold)
            .foregroundColor(.white)
            .padding(.horizontal, 12)
            .padding(.vertical, 4)
            .background(color)
            .cornerRadius(12)
    }
}

struct CallHistoryRow: View {
    let call: Call
    let viewModel: CallViewModel

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(formatDate(call.started_at))
                    .font(.subheadline)
                    .fontWeight(.medium)

                Text(viewModel.getCallStatusText(call))
                    .font(.caption)
                    .foregroundColor(.gray)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                Text(viewModel.getCallDurationText(call))
                    .font(.subheadline)

                if call.is_successful {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(8)
        .shadow(color: Color.black.opacity(0.05), radius: 2, x: 0, y: 1)
    }

    private func formatDate(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        if let date = formatter.date(from: dateString) {
            let displayFormatter = DateFormatter()
            displayFormatter.dateFormat = "MM/dd HH:mm"
            return displayFormatter.string(from: date)
        }
        return dateString
    }
}
