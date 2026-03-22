import 'dart:async' show Timer;

import 'package:flutter/material.dart';

import 'login_page.dart';

const String kDisplayName = '21110333 - Đoàn Nguyễn Nam Trung';

/// Shows [kDisplayName], then after 10 seconds navigates to [LoginPage].
class NameIntroPage extends StatefulWidget {
  const NameIntroPage({super.key});

  @override
  State<NameIntroPage> createState() => _NameIntroPageState();
}

class _NameIntroPageState extends State<NameIntroPage> {
  Timer? _goToLoginTimer;

  @override
  void initState() {
    super.initState();
    _goToLoginTimer = Timer(const Duration(seconds: 10), () {
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute<void>(
          builder: (BuildContext context) => const LoginPage(),
        ),
      );
    });
  }

  @override
  void dispose() {
    _goToLoginTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Text(
          kDisplayName,
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.headlineMedium,
        ),
      ),
    );
  }
}
