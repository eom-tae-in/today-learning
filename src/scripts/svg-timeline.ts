export class SvgTimeline {
    private animations: CSSAnimation[];

    constructor(private readonly shadow: ShadowRoot, private readonly svg: SVGSVGElement) {
        this.animations = this.currentAnimations();
    }

    private currentAnimations(): CSSAnimation[] {
        return this.shadow.getAnimations().filter((animation): animation is CSSAnimation => animation instanceof CSSAnimation);
    }

    private rememberAnimations(): void {
        for (const animation of this.currentAnimations()) {
            if (!this.animations.includes(animation)) this.animations.push(animation);
        }
    }

    reset(): void {
        this.rememberAnimations();
        this.svg.setCurrentTime(0);
        for (const animation of this.animations) {
            if (animation.playState !== "idle") animation.currentTime = 0;
        }
    }

    move(destination: () => void): void {
        this.rememberAnimations();
        const time = this.svg.getCurrentTime();
        const saved = new Map<Element, Map<string, (CSSNumberish | null)[]>>();
        for (const animation of this.animations) {
            const target = animation.effect instanceof KeyframeEffect ? animation.effect.target : null;
            if (!target || animation.playState === "idle") continue;
            let names = saved.get(target);
            if (!names) { names = new Map(); saved.set(target, names); }
            let times = names.get(animation.animationName);
            if (!times) { times = []; names.set(animation.animationName, times); }
            times.push(animation.currentTime);
        }
        destination();
        this.svg.setCurrentTime(time);
        this.animations = this.currentAnimations();
        for (const animation of this.animations) {
            const target = animation.effect instanceof KeyframeEffect ? animation.effect.target : null;
            const times = target ? saved.get(target)?.get(animation.animationName) : undefined;
            const previous = times?.shift();
            if (previous !== undefined) animation.currentTime = previous;
        }
    }
}
